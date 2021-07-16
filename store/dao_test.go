package store

import (
	"github.com/laszlocph/1clickinfra/model"
	"github.com/laszlocph/1clickinfra/template"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUserCRUD(t *testing.T) {
	s := NewTest()
	defer func() {
		s.Close()
	}()

	user := model.User{
		Login:              "aLogin",
		AccessToken:        "aGithubToken",
		RefreshToken:       "refreshToken",
		Prefs:              model.Prefs{PR: true, Tidbits: true},
		WrittenGitopsRepos: []string{"first", "second"},
		Installations: []*model.Installation{
			{
				ID:    1,
				Owner: "aLogin",
			},
		},
	}

	err := s.CreateUser(&user)
	assert.Nil(t, err)

	_, err = s.User("noSuchLogin")
	assert.NotNil(t, err)

	u, err := s.User("aLogin")
	assert.Nil(t, err)
	assert.Equal(t, user.Login, u.Login)
	assert.Equal(t, user.AccessToken, u.AccessToken)
	assert.Equal(t, user.RefreshToken, u.RefreshToken)
	assert.Equal(t, user.Prefs, u.Prefs)
	assert.Equal(t, user.WrittenGitopsRepos, u.WrittenGitopsRepos)
	assert.Equal(t, user.Installations, u.Installations)

	users, err := s.Users()
	assert.Nil(t, err)
	assert.Equal(t, len(users), 1)
}

func TestComponentStateCRUD(t *testing.T) {
	s := NewTest()
	defer func() {
		s.Close()
	}()

	componentState := model.ComponentState{
		Login:             "aLogin",
		ComponentStateMap: map[string]template.Options{"myRepo": {Loki: template.Loki{Enabled: true}}},
	}

	err := s.CreateComponentState(&componentState)
	assert.Nil(t, err)

	_, err = s.User("nosuchlogin")
	assert.NotNil(t, err)

	c, err := s.ComponentState("aLogin")
	assert.Nil(t, err)
	assert.Equal(t, componentState.Login, c.Login)
	assert.Equal(t, componentState.ComponentStateMap, c.ComponentStateMap)

	componentState.ComponentStateMap = map[string]template.Options{
		"myRepo":  {Loki: template.Loki{Enabled: true}},
		"myRepo2": {Loki: template.Loki{Enabled: true}},
	}
	err = s.UpdateComponentState(&componentState)
	assert.Nil(t, err)

	c, err = s.ComponentState("aLogin")
	assert.Nil(t, err)
	assert.Equal(t, componentState.ComponentStateMap, c.ComponentStateMap)
}
