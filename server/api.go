package server

import (
	"encoding/json"
	"fmt"
	"github.com/drone/go-scm/scm"
	"github.com/gimlet-io/gimlet-dashboard/api"
	"github.com/gimlet-io/gimlet-dashboard/cmd/dashboard/config"
	"github.com/gimlet-io/gimlet-dashboard/gitService"
	"github.com/gimlet-io/gimlet-dashboard/model"
	"github.com/gimlet-io/gimlet-dashboard/store"
	"github.com/gimlet-io/gimletd/client"
	gimletdModel "github.com/gimlet-io/gimletd/model"
	"github.com/go-chi/chi"
	"github.com/sirupsen/logrus"
	"golang.org/x/oauth2"
	"net/http"
	"strings"
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

func gimletd(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := ctx.Value("user").(*model.User)
	config := ctx.Value("config").(*config.Config)

	if config.GimletD.URL == "" ||
		config.GimletD.TOKEN == "" {
		w.WriteHeader(http.StatusNotFound)
	}

	oauth2Config := new(oauth2.Config)
	auth := oauth2Config.Client(
		oauth2.NoContext,
		&oauth2.Token{
			AccessToken: config.GimletD.TOKEN,
		},
	)

	client := client.NewClient(config.GimletD.URL, auth)
	gimletdUser, err := client.UserGet(user.Login, true)
	if err != nil && strings.Contains(err.Error(), "Not Found") {
		gimletdUser, err = client.UserPost(&gimletdModel.User{Login: user.Login})
	}
	if err != nil {
		logrus.Errorf("cannot get GimletD user: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	userString, err := json.Marshal(map[string]interface{}{
		"url":  config.GimletD.URL,
		"user": gimletdUser,
	})
	if err != nil {
		logrus.Errorf("cannot serialize user: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(userString)
}

func envs(w http.ResponseWriter, r *http.Request) {
	agentHub, _ := r.Context().Value("agentHub").(*AgentHub)

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

	envString, err := json.Marshal(envs)
	if err != nil {
		logrus.Errorf("cannot serialize envs: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	agentHub.ForceStateSend()

	w.WriteHeader(200)
	w.Write(envString)
}

func rolloutHistory(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "name")

	ctx := r.Context()
	config := ctx.Value("config").(*config.Config)
	if config.GimletD.URL == "" ||
		config.GimletD.TOKEN == "" {
		w.WriteHeader(http.StatusNotFound)
	}
	oauth2Config := new(oauth2.Config)
	auth := oauth2Config.Client(
		oauth2.NoContext,
		&oauth2.Token{
			AccessToken: config.GimletD.TOKEN,
		},
	)
	client := client.NewClient(config.GimletD.URL, auth)

	agentHub, _ := r.Context().Value("agentHub").(*AgentHub)
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

	releases := map[string]interface{}{}
	for _, env := range envs {
		appReleases := map[string]interface{}{}
		for _, stack := range env.Stacks {
			if stack.Repo != fmt.Sprintf("%s/%s", owner, name) {
				continue
			}

			r, err := client.ReleasesGet(
				stack.Service.Name,
				env.Name,
				10,
				0,
				fmt.Sprintf("%s/%s", owner, name),
				nil, nil,
			)
			if err != nil {
				logrus.Errorf("cannot get releases: %s", err)
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
				return
			}
			appReleases[stack.Service.Name] = r
		}
		releases[env.Name] = appReleases
	}

	releasesString, err := json.Marshal(releases)
	if err != nil {
		logrus.Errorf("cannot serialize releases: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(releasesString)
}

func commits(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "name")
	repo := owner + "/" + name

	ctx := r.Context()
	dao := ctx.Value("store").(*store.Store)
	commits, err := dao.Commits(repo)
	if err != nil {
		logrus.Errorf("cannot get commits: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	commitsString, err := json.Marshal(commits)
	if err != nil {
		logrus.Errorf("cannot serialize commits: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(commitsString)

	config := ctx.Value("config").(*config.Config)
	gitServiceImpl := ctx.Value("gitService").(gitService.GitService)
	tokenManager := ctx.Value("tokenManager").(gitService.NonImpersonatedTokenManager)
	token, _, _ := tokenManager.Token()

	go fetchCommits(owner, name, gitServiceImpl, token, dao, config)
}

func fetchCommits(
	owner string,
	repo string,
	gitService gitService.GitService,
	token string,
	store *store.Store,
	config *config.Config,
) {
	commits, err := gitService.FetchCommits(owner, repo, token)
	if err != nil {
		logrus.Errorf("Could not fetch commits for %v, %v", repo, err)
		return
	}

	err = store.SaveCommits(scm.Join(owner, repo), commits)
	if err != nil {
		logrus.Errorf("Could not store commits for %v, %v", repo, err)
		return
	}
	if config.IsGithub() {
		statusOnCommits := map[string]*model.CombinedStatus{}
		for _, c := range commits {
			statusOnCommits[c.SHA] = &c.Status
		}

		if len(statusOnCommits) != 0 {
			err = store.SaveStatusesOnCommits(scm.Join(owner, repo), statusOnCommits)
			if err != nil {
				logrus.Errorf("Could not store status for %v, %v", repo, err)
				return
			}
		}
	}
}
