package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gimlet-io/gimlet-dashboard/api"
	"github.com/gimlet-io/gimlet-dashboard/cmd/dashboard/config"
	"github.com/gimlet-io/gimlet-dashboard/git/customScm"
	"github.com/gimlet-io/gimlet-dashboard/git/genericScm"
	"github.com/gimlet-io/gimlet-dashboard/git/nativeGit"
	"github.com/gimlet-io/gimlet-dashboard/model"
	"github.com/gimlet-io/gimlet-dashboard/server/streaming"
	"github.com/gimlet-io/gimlet-dashboard/store"
	"github.com/gimlet-io/gimletd/dx"
	"github.com/go-chi/chi"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

func user(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := ctx.Value("user").(*model.User)
	userString, err := json.Marshal(user)
	if err != nil {
		logrus.Errorf("cannot serialize user: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	w.WriteHeader(200)
	w.Write(userString)
}

func envs(w http.ResponseWriter, r *http.Request) {
	agentHub, _ := r.Context().Value("agentHub").(*streaming.AgentHub)

	envs := []*api.Env{
		// {
		// 	Name:   "staging",
		// 	Stacks: []*api.Stack{},
		// },
	}
	for _, a := range agentHub.Agents {
		for _, stack := range a.Stacks {
			stack.Env = a.Name
		}
		envs = append(envs, &api.Env{
			Name:   a.Name,
			Stacks: a.Stacks,
		})
	}

	err := decorateDeployments(r.Context(), envs)
	if err != nil {
		logrus.Errorf("cannot decorate deployments: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	envString, err := json.Marshal(envs)
	if err != nil {
		logrus.Errorf("cannot serialize envs: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	w.WriteHeader(200)
	w.Write(envString)

	time.Sleep(50 * time.Millisecond) // there is a race condition in local dev: the refetch arrives sooner
	go agentHub.ForceStateSend()
}

func agents(w http.ResponseWriter, r *http.Request) {
	agentHub, _ := r.Context().Value("agentHub").(*streaming.AgentHub)

	agents := []string{} //[]string{"staging"}
	for _, a := range agentHub.Agents {
		agents = append(agents, a.Name)
	}

	agentsString, err := json.Marshal(map[string]interface{}{
		"agents": agents,
	})
	if err != nil {
		logrus.Errorf("cannot serialize agents: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	w.WriteHeader(200)
	w.Write(agentsString)
}

func decorateDeployments(ctx context.Context, envs []*api.Env) error {
	dao := ctx.Value("store").(*store.Store)
	gitServiceImpl := ctx.Value("gitService").(customScm.CustomGitService)
	tokenManager := ctx.Value("tokenManager").(customScm.NonImpersonatedTokenManager)
	token, _, _ := tokenManager.Token()
	for _, env := range envs {
		for _, stack := range env.Stacks {
			if stack.Deployment == nil {
				continue
			}
			_, err := decorateDeploymentWithSCMData(stack.Repo, stack.Deployment, dao, gitServiceImpl, token)
			if err != nil {
				return fmt.Errorf("cannot decorate commits: %s", err)
			}
		}
	}
	return nil
}

func switchToBranch(repo *git.Repository, branch string) error {
	b := plumbing.ReferenceName(fmt.Sprintf("refs/heads/%s", branch))
	worktree, err := repo.Worktree()
	if err != nil {
		return err
	}
	return worktree.Checkout(&git.CheckoutOptions{Create: false, Force: false, Branch: b})
}

func branches(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "name")
	repoName := fmt.Sprintf("%s/%s", owner, name)

	ctx := r.Context()
	gitRepoCache, _ := ctx.Value("gitRepoCache").(*nativeGit.RepoCache)

	repo, err := gitRepoCache.InstanceForRead(repoName)
	if err != nil {
		logrus.Errorf("cannot get repo: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	branches := []string{}
	refIter, _ := repo.References()
	refIter.ForEach(func(r *plumbing.Reference) error {
		if r.Name().IsBranch() {
			branch := r.Name().Short()
			branches = append(branches, strings.TrimPrefix(branch, "origin/"))
		}
		return nil
	})

	branchesString, err := json.Marshal(branches)
	if err != nil {
		logrus.Errorf("cannot serialize branches: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(branchesString)
}

// envConfig fetches the environment config from source control
func envConfig(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	repoName := chi.URLParam(r, "name")
	repoPath := fmt.Sprintf("%s/%s", owner, repoName)

	env := chi.URLParam(r, "env")
	envConfigPath := fmt.Sprintf(".gimlet/%s.yaml", env)

	ctx := r.Context()
	tokenManager := ctx.Value("tokenManager").(customScm.NonImpersonatedTokenManager)
	token, _, _ := tokenManager.Token()

	config := ctx.Value("config").(*config.Config)
	goScm := genericScm.NewGoScmHelper(config, nil)

	envConfigString, _, err := goScm.Content(token, repoPath, envConfigPath)
	if err != nil {
		if strings.Contains(err.Error(), "Not Found") {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("{}"))
		} else {
			logrus.Errorf("cannot fetch envConfig from github: %s", err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			w.Write([]byte("{}"))
		}
		return
	}

	var envConfig dx.Manifest
	err = yaml.Unmarshal([]byte(envConfigString), &envConfig)
	if err != nil {
		logrus.Errorf("cannot parse Env config string: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	envConfigJson, err := json.Marshal(envConfig)
	if err != nil {
		logrus.Errorf("cannot convert yaml to json: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(envConfigJson))
}

func chartSchema(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tokenManager := ctx.Value("tokenManager").(customScm.NonImpersonatedTokenManager)
	token, _, _ := tokenManager.Token()

	config := ctx.Value("config").(*config.Config)
	goScm := genericScm.NewGoScmHelper(config, nil)

	repo := "gimlet-io/onechart"
	schemaPath := "charts/onechart/values.schema.json"
	helmUIPath := "charts/onechart/helm-ui.json"

	schemaString, _, err := goScm.Content(token, repo, schemaPath)
	if err != nil {
		logrus.Errorf("cannot fetch schema from github: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	helmUIString, _, err := goScm.Content(token, repo, helmUIPath)
	if err != nil {
		logrus.Errorf("cannot fetch UI schema from github: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	var schema interface{}
	err = json.Unmarshal([]byte(schemaString), &schema)
	if err != nil {
		logrus.Errorf("cannot parse schema: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	var helmUI interface{}
	err = json.Unmarshal([]byte(helmUIString), &helmUI)
	if err != nil {
		logrus.Errorf("cannot parse UI schema: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	schemas := map[string]interface{}{}
	schemas["chartSchema"] = schema
	schemas["uiSchema"] = helmUI

	schemasString, err := json.Marshal(schemas)
	if err != nil {
		logrus.Errorf("cannot serialize schemas: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(schemasString))
}

func saveEnvConfig(w http.ResponseWriter, r *http.Request) {
	var values map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&values)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(err.Error()))
		return
	}

	fmt.Println(values)

	owner := chi.URLParam(r, "owner")
	repoName := chi.URLParam(r, "name")
	repoPath := fmt.Sprintf("%s/%s", owner, repoName)

	env := chi.URLParam(r, "env")
	envConfigPath := fmt.Sprintf(".gimlet/%s.yaml", env)

	toSave := &dx.Manifest{
		App: repoName,
		Env: env,
		Chart: dx.Chart{
			Name:       "onechart",
			Repository: "https://chart.onechart.dev",
			Version:    "0.32.0",
		},
		Namespace: "staging",
	}
	toSave.Values = values
	fmt.Println(toSave)

	ctx := r.Context()
	tokenManager := ctx.Value("tokenManager").(customScm.NonImpersonatedTokenManager)
	token, _, _ := tokenManager.Token()

	config := ctx.Value("config").(*config.Config)
	goScm := genericScm.NewGoScmHelper(config, nil)

	toSaveString, err := yaml.Marshal(toSave)
	if err != nil {
		logrus.Errorf("cannot marshal manifest: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	_, blobID, err := goScm.Content(token, repoPath, envConfigPath)
	if err != nil {
		if strings.Contains(err.Error(), "Not Found") {
			err = goScm.CreateContent(token, repoPath, envConfigPath, toSaveString)
			if err != nil {
				logrus.Errorf("cannot create manifest: %s", err)
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
				return
			}
		} else {
			logrus.Errorf("cannot fetch envConfig from github: %s", err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			w.Write([]byte("{}"))
		}
		return
	} else {
		err = goScm.UpdateContent(token, repoPath, envConfigPath, toSaveString, blobID)
		if err != nil {
			logrus.Errorf("cannot update manifest: %s", err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(200)
	w.Write([]byte("{}"))
}
