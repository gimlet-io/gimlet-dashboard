package server

import (
	"encoding/json"
	"github.com/gimlet-io/gimlet-dashboard/api"
	"github.com/gimlet-io/gimlet-dashboard/model"
	"github.com/sirupsen/logrus"
	"net/http"
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
	agentHub, _ := r.Context().Value("agentHub").(*AgentHub)

	envs := []*api.Env{}
	for _, a := range agentHub.Agents {
		for _, stack := range a.Stacks {
			stack.Env = a.Name
		}
		envs = append(envs, &api.Env{
			Name: a.Name,
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
