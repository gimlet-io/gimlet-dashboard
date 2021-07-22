package server

import (
	"context"
	"database/sql"
	"encoding/base32"
	"github.com/drone/go-scm/scm"
	"github.com/gimlet-io/gimlet-dashboard/cmd/dashboard/config"
	"github.com/gimlet-io/gimlet-dashboard/model"
	"github.com/gimlet-io/gimlet-dashboard/server/httputil"
	"github.com/gimlet-io/gimlet-dashboard/server/token"
	"github.com/gimlet-io/gimlet-dashboard/store"
	"github.com/gorilla/securecookie"
	"github.com/laszlocph/go-login/login"
	log "github.com/sirupsen/logrus"
	"net/http"
	"time"
)

func auth(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	err := login.ErrorFrom(ctx)
	if err != nil {
		log.Errorf("cannot get access token: %s", err)
		http.Error(w, "Cannot decode token", 400)
		return
	}
	token := login.TokenFrom(ctx)

	git, _ := ctx.Value("git").(*scm.Client)
	gitContext := context.WithValue(context.Background(), scm.TokenKey{}, &scm.Token{
		Token:   token.Access,
		Refresh: token.Refresh,
	})
	scmUser, _, err := git.Users.Find(gitContext)
	if err != nil {
		log.Errorf("cannot find git user: %s", err)
		http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
		return
	}

	orgList, _, err := git.Organizations.List(gitContext, scm.ListOptions{
		Size: 50,
	})
	if err != nil {
		log.Errorf("cannot get user organizations: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	config, _ := ctx.Value("config").(*config.Config)
	member := validateOrganizationMembership(orgList, config.Github.Org, scmUser.Login)

	if !member {
		http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		return
	}

	store := ctx.Value("store").(*store.Store)
	user, err := getOrCreateUser(store, scmUser, token)
	if err != nil {
		log.Errorf("cannot get or store user: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	err = setSessionCookie(w, r, user)
	if err != nil {
		log.Errorf("cannot set session cookie: %s", err)
		http.Error(w, http.StatusText(500), 500)
		return
	}

	http.RedirectHandler("/"+token.AppState, 303).ServeHTTP(w, r)
}

func validateOrganizationMembership(orgList []*scm.Organization, org string, userName string) bool {
	if org == userName { // allowing single user installations
		return true
	}

	for _, organization := range orgList {
		if org == organization.Name {
			return true
		}
	}
	return false
}

func logout(w http.ResponseWriter, r *http.Request) {
	httputil.DelCookie(w, r, "user_sess")
	http.RedirectHandler("/login", 303).ServeHTTP(w, r)
}

func getOrCreateUser(store *store.Store, scmUser *scm.User, token *login.Token) (*model.User, error) {
	user, err := store.User(scmUser.Login)
	if err != nil {
		switch err {
		case sql.ErrNoRows:
			user = &model.User{
				Login:        scmUser.Login,
				Name:         scmUser.Name,
				Email:        scmUser.Email,
				AccessToken:  token.Access,
				RefreshToken: token.Refresh,
				Expires:      token.Expires.Unix(),
				Secret: base32.StdEncoding.EncodeToString(
					securecookie.GenerateRandomKey(32),
				),
			}
			err = store.CreateUser(user)
			if err != nil {
				return nil, err
			}
			break
		default:
			return nil, err
		}
	} else {
		user.Name = scmUser.Name // Remove this 2 releases from now
		user.AccessToken = token.Access
		user.RefreshToken = token.Refresh
		user.Expires = token.Expires.Unix()
		err = store.UpdateUser(user)
		if err != nil {
			return nil, err
		}
	}

	return user, err
}

func setSessionCookie(w http.ResponseWriter, r *http.Request, user *model.User) error {
	twelveHours, _ := time.ParseDuration("12h")
	exp := time.Now().Add(twelveHours).Unix()
	t := token.New(token.SessToken, user.Login)
	tokenStr, err := t.SignExpires(user.Secret, exp)
	if err != nil {
		return err
	}

	httputil.SetCookie(w, r, "user_sess", tokenStr)
	return nil
}
