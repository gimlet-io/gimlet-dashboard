package server

import (
	"encoding/json"
	"github.com/gimlet-io/gimlet-dashboard/cmd/dashboard/config"
	"github.com/gimlet-io/gimlet-dashboard/git/customScm"
	"github.com/gimlet-io/gimlet-dashboard/git/genericScm"
	"github.com/gimlet-io/gimlet-dashboard/model"
	"github.com/gimlet-io/gimlet-dashboard/store"
	"github.com/gimlet-io/go-scm/scm"
	"github.com/sirupsen/logrus"
	"net/http"
	"time"
)

func gitRepos(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := ctx.Value("user").(*model.User)

	gitServiceImpl := ctx.Value("gitService").(customScm.CustomGitService)
	tokenManager := ctx.Value("tokenManager").(customScm.NonImpersonatedTokenManager)
	token, _, _ := tokenManager.Token()
	orgRepos, err := gitServiceImpl.OrgRepos(token)
	if err != nil {
		logrus.Errorf("cannot get org repos: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	userHasAccessToRepos := intersection(orgRepos, user.Repos)
	if userHasAccessToRepos == nil {
		userHasAccessToRepos = []string{}
	}
	reposString, err := json.Marshal(userHasAccessToRepos)
	if err != nil {
		logrus.Errorf("cannot serialize repos: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	w.WriteHeader(200)
	w.Write(reposString)

	config := ctx.Value("config").(*config.Config)
	dao := ctx.Value("store").(*store.Store)
	go updateUserRepos(config, dao, user)
}

func updateUserRepos(config *config.Config, dao *store.Store, user *model.User) {
	goScmHelper := genericScm.NewGoScmHelper(config, func(token *scm.Token) {
		user.AccessToken = token.Token
		user.RefreshToken = token.Refresh
		user.Expires = token.Expires.Unix()
		err := dao.UpdateUser(user)
		if err != nil {
			logrus.Errorf("could not refresh user's oauth access_token")
		}
	})
	userRepos, err := goScmHelper.UserRepos(user.AccessToken, user.RefreshToken, time.Unix(user.Expires, 0))
	if err != nil {
		logrus.Warnf("cannot get user repos: %s", err)
		return
	}

	user.Repos = userRepos
	err = dao.UpdateUser(user)
	if err != nil {
		logrus.Warnf("cannot get user repos: %s", err)
		return
	}
}

func intersection(s1, s2 []string) (inter []string) {
	hash := make(map[string]bool)
	for _, e := range s1 {
		hash[e] = true
	}
	for _, e := range s2 {
		// If elements present in the hashmap then append intersection list.
		if hash[e] {
			inter = append(inter, e)
		}
	}

	return
}

type favRepos struct {
	FavoriteRepos []string `json:"favoriteRepos"`
}

func saveFavoriteRepos(w http.ResponseWriter, r *http.Request) {
	var reposPayload favRepos
	err := json.NewDecoder(r.Body).Decode(&reposPayload)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(err.Error()))
		return
	}

	ctx := r.Context()
	user := ctx.Value("user").(*model.User)
	dao := ctx.Value("store").(*store.Store)

	user.FavoriteRepos = reposPayload.FavoriteRepos
	err = dao.UpdateUser(user)
	if err != nil {
		logrus.Errorf("cannot save favorite repos: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	w.WriteHeader(200)
	w.Write([]byte("{}"))
}

func saveFavoriteServices(w http.ResponseWriter, r *http.Request) {
	var servicesPayload map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&servicesPayload)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(err.Error()))
		return
	}

	var services []string
	if s, ok := servicesPayload["favoriteServices"]; ok {
		services = s.([]string)
	} else {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(err.Error()))
		return
	}

	ctx := r.Context()
	user := ctx.Value("user").(*model.User)
	dao := ctx.Value("store").(*store.Store)

	user.FavoriteServices = services
	err = dao.UpdateUser(user)
	if err != nil {
		logrus.Errorf("cannot save favorite services: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	w.WriteHeader(200)
	w.Write([]byte("{}"))
}
