package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gimlet-io/gimlet-dashboard/git/nativeGit"
	"github.com/gimlet-io/gimletd/dx"
	helper "github.com/gimlet-io/gimletd/git/nativeGit"
	"github.com/go-chi/chi"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/opencontainers/runc/Godeps/_workspace/src/github.com/Sirupsen/logrus"
	"gopkg.in/yaml.v2"
)

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

// envConfig fetches all environment configs from source control for a repo
func envConfigs(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	repoName := chi.URLParam(r, "name")

	ctx := r.Context()
	gitRepoCache, _ := ctx.Value("gitRepoCache").(*nativeGit.RepoCache)

	repo, err := gitRepoCache.InstanceForRead(fmt.Sprintf("%s/%s", owner, repoName))
	if err != nil {
		logrus.Errorf("cannot get repo: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	files, err := helper.Folder(repo, ".gimlet")
	if err != nil {
		if strings.Contains(err.Error(), "no such file or directory") {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(""))
		} else {
			logrus.Errorf("cannot list files in .gimlet/: %s", err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
	}

	envConfigs := []dx.Manifest{}
	for _, content := range files {
		var envConfig dx.Manifest
		err = yaml.Unmarshal([]byte(content), &envConfig)
		if err != nil {
			logrus.Warnf("cannot parse env config string: %s", err)
			continue
		}
		envConfigs = append(envConfigs, envConfig)
	}

	configsPerEnv := map[string][]dx.Manifest{}
	for _, config := range envConfigs {
		if configsPerEnv[config.Env] == nil {
			configsPerEnv[config.Env] = []dx.Manifest{}
		}

		configsPerEnv[config.Env] = append(configsPerEnv[config.Env], config)
	}

	configsPerEnvJson, err := json.Marshal(configsPerEnv)
	if err != nil {
		logrus.Errorf("cannot convert envconfigs to json: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(configsPerEnvJson))
}
