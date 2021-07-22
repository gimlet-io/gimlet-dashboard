package server

import (
	"encoding/json"
	"github.com/gimlet-io/gimlet-dashboard/api"
	"github.com/gimlet-io/gimlet-dashboard/cmd/dashboard/config"
	"github.com/gimlet-io/gimlet-dashboard/model"
	"github.com/gimlet-io/gimletd/client"
	gimletdModel "github.com/gimlet-io/gimletd/model"
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

	w.WriteHeader(200)
	w.Write(envString)
}
