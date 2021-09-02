package server

import (
	"encoding/json"
	"fmt"
	"github.com/gimlet-io/gimlet-dashboard/api"
	"github.com/gimlet-io/gimlet-dashboard/cmd/dashboard/config"
	"github.com/gimlet-io/gimlet-dashboard/model"
	"github.com/gimlet-io/gimlet-dashboard/server/streaming"
	"github.com/gimlet-io/gimletd/client"
	"github.com/gimlet-io/gimletd/dx"
	gimletdModel "github.com/gimlet-io/gimletd/model"
	"github.com/go-chi/chi"
	"github.com/sirupsen/logrus"
	"golang.org/x/oauth2"
	"net/http"
	"strings"
	"sync"
	"time"
)

func gitopsRepo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	config := ctx.Value("config").(*config.Config)

	if config.GimletD.URL == "" ||
		config.GimletD.TOKEN == "" {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("{}"))
	}

	oauth2Config := new(oauth2.Config)
	auth := oauth2Config.Client(
		oauth2.NoContext,
		&oauth2.Token{
			AccessToken: config.GimletD.TOKEN,
		},
	)

	client := client.NewClient(config.GimletD.URL, auth)
	gitopsRepo, err := client.GitopsRepoGet()
	if err != nil {
		logrus.Errorf("cannot get gitops repo: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	gitopsRepoString, err := json.Marshal(map[string]interface{}{
		"gitopsRepo": gitopsRepo,
	})
	if err != nil {
		logrus.Errorf("cannot serialize gitopsRepo: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(gitopsRepoString)
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

	// limiting query scope
	// without these, for apps released just once, the whole history would be traversed
	since := time.Now().Add(-1 * time.Hour*24*30)
	limit := 10

	type fetchResult struct {
		env string
		app string
		releases []*dx.Release
		err     error
	}

	c := make(chan *fetchResult)
	var wg sync.WaitGroup

	for _, env := range envs {
		for _, stack := range env.Stacks {
			if stack.Repo != fmt.Sprintf("%s/%s", owner, name) {
				continue
			}

			wg.Add(1)
			go func(wg *sync.WaitGroup, c chan *fetchResult, env string, app string) {
				defer wg.Done()

				r, err := client.ReleasesGet(
					app,
					env,
					limit,
					0,
					"",
					&since, nil,
				)

				c <- &fetchResult{
					env: env,
					app: app,
					releases: r,
					err: err}
			}(&wg, c, env.Name, stack.Service.Name)
		}
	}

	go func() {
		wg.Wait()
		close(c)
	}()

	var result []*fetchResult
	for r := range c {
		result = append(result, r)
	}

	releases := map[string]map[string]interface{}{}
	for _, r := range result {
		if r.err != nil {
			logrus.Errorf("cannot get releases: %s", r.err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
		appReleases := releases[r.env]
		if appReleases == nil {
			appReleases = map[string]interface{}{}
		}

		appReleases[r.app] = r.releases
		releases[r.env] = appReleases
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

func deploy(w http.ResponseWriter, r *http.Request) {
	var releaseRequest dx.ReleaseRequest
	err := json.NewDecoder(r.Body).Decode(&releaseRequest)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(err.Error()))
		return
	}

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
	adminClient := client.NewClient(config.GimletD.URL, auth)

	user := ctx.Value("user").(*model.User)
	gimletdUser, err := adminClient.UserGet(user.Login, true)
	if err != nil {
		logrus.Errorf("cannot find gimletd user: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	oauth2Config = new(oauth2.Config)
	auth = oauth2Config.Client(
		oauth2.NoContext,
		&oauth2.Token{
			AccessToken: gimletdUser.Token,
		},
	)
	impersonatedClient := client.NewClient(config.GimletD.URL, auth)

	trackingID, err := impersonatedClient.ReleasesPost(releaseRequest)
	if err != nil {
		logrus.Errorf("cannot post release: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	trackingString, err := json.Marshal(map[string]interface{}{
		"trackingId": trackingID,
	})
	if err != nil {
		logrus.Errorf("cannot serialize trackingId: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(trackingString)
}

func rollback(w http.ResponseWriter, r *http.Request) {
	var rollbackRequest dx.RollbackRequest
	err := json.NewDecoder(r.Body).Decode(&rollbackRequest)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(err.Error()))
		return
	}

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
	adminClient := client.NewClient(config.GimletD.URL, auth)

	user := ctx.Value("user").(*model.User)
	gimletdUser, err := adminClient.UserGet(user.Login, true)
	if err != nil {
		logrus.Errorf("cannot find gimletd user: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	oauth2Config = new(oauth2.Config)
	auth = oauth2Config.Client(
		oauth2.NoContext,
		&oauth2.Token{
			AccessToken: gimletdUser.Token,
		},
	)
	impersonatedClient := client.NewClient(config.GimletD.URL, auth)

	trackingID, err := impersonatedClient.RollbackPost(
		rollbackRequest.Env,
		rollbackRequest.App,
		rollbackRequest.TargetSHA,
	)
	if err != nil {
		logrus.Errorf("cannot post rollback: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	trackingString, err := json.Marshal(map[string]interface{}{
		"trackingId": trackingID,
	})
	if err != nil {
		logrus.Errorf("cannot serialize trackingId: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(trackingString)
}

func deployStatus(w http.ResponseWriter, r *http.Request) {
	trackingId := r.URL.Query().Get("trackingId")
	if trackingId == "" {
		http.Error(w, fmt.Sprintf("%s: %s", http.StatusText(http.StatusBadRequest), "trackingId parameter is mandatory"), http.StatusBadRequest)
		return
	}

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

	releaseStatus, err := client.TrackGet(trackingId)
	if err != nil {
		logrus.Errorf("cannot get deployStatus: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	releaseStatusString, err := json.Marshal(releaseStatus)
	if err != nil {
		logrus.Errorf("cannot serialize releaseStatus: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(releaseStatusString)
}

func decorateCommitsWithGimletArtifacts(commits []*Commit, config *config.Config) ([]*Commit, error) {
	if config.GimletD.URL == "" ||
		config.GimletD.TOKEN == "" {
		logrus.Warnf("couldn't connect to Gimletd for artifact data: gimletd access not configured")
		return commits, nil
	}
	oauth2Config := new(oauth2.Config)
	auth := oauth2Config.Client(
		oauth2.NoContext,
		&oauth2.Token{
			AccessToken: config.GimletD.TOKEN,
		},
	)
	client := client.NewClient(config.GimletD.URL, auth)

	var hashes []string
	for _, c := range commits {
		hashes = append(hashes, c.SHA)
	}

	artifacts, err := client.ArtifactsGet(
		"", "",
		nil,
		"",
		hashes,
		0, 0,
		nil, nil,
	)
	if err != nil {
		return commits, fmt.Errorf("cannot get artifacts: %s", err)
	}

	artifactsBySha := map[string]*dx.Artifact{}
	for _, a := range artifacts {
		artifactsBySha[a.Version.SHA] = a
	}

	var decoratedCommits []*Commit
	for _, c := range commits {
		if artifact, ok := artifactsBySha[c.SHA]; ok {
			for _, targetEnv := range artifact.Environments {
				targetEnv.ResolveVars(artifact.Context)
				if c.DeployTargets == nil {
					c.DeployTargets = []*DeployTarget{}
				}
				c.DeployTargets = append(c.DeployTargets, &DeployTarget{
					App:        targetEnv.App,
					Env:        targetEnv.Env,
					ArtifactId: artifact.ID,
				})
			}
		}
		decoratedCommits = append(decoratedCommits, c)
	}

	return decoratedCommits, nil
}
