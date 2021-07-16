package store

import (
	"github.com/gimlet-io/gimlet-dashboard/model"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUserCRUD(t *testing.T) {
	s := NewTest()
	defer func() {
		s.Close()
	}()

	user := model.User{
		Login:        "aLogin",
		AccessToken:  "aGithubToken",
		RefreshToken: "refreshToken",
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
}
