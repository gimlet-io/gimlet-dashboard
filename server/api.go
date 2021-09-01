package server

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/gimlet-io/gimlet-dashboard/api"
	"github.com/gimlet-io/gimlet-dashboard/git/customScm"
	"github.com/gimlet-io/gimlet-dashboard/git/nativeGit"
	"github.com/gimlet-io/gimlet-dashboard/model"
	"github.com/gimlet-io/gimlet-dashboard/server/streaming"
	"github.com/gimlet-io/gimlet-dashboard/store"
	"github.com/go-chi/chi"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/sirupsen/logrus"
	"net/http"
	"strings"
	"time"
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

	envs := []*api.Env{}
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

	agents := []string{}
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
