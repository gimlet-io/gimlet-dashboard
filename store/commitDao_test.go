package store

import (
	"github.com/gimlet-io/gimlet-dashboard/model"
	"github.com/stretchr/testify/assert"
	"testing"
	"time"
)

func TestCommitCRUD(t *testing.T) {
	s := NewTest()
	defer func() {
		s.Close()
	}()

	atime := time.Now()
	commit := model.Commit{
		Repo:      "aRepo",
		SHA:       "asha",
		URL:       "aUrl",
		Author:    "anAuthor",
		AuthorPic: "anAuthorPic",
		CreatedAt: atime.Unix(),
		Tags:      []string{"aTag", "another"},
	}

	err := s.CreateCommit(&commit)
	assert.Nil(t, err)

	commits, err := s.Commits("aRepo")
	assert.Nil(t, err)
	assert.Equal(t, 1, len(commits))
	assert.Equal(t, atime.Unix(), commits[0].CreatedAt)
}

func TestBulkCommitCreate(t *testing.T) {
	s := NewTest()
	defer func() {
		s.Close()
	}()

	commits := []*model.Commit{
		{
			Repo: "aRepo",
			SHA:  "aSha",
		},
	}

	err := s.SaveCommits("aRepo", commits)
	assert.Nil(t, err)

	commits, err = s.Commits("aRepo")
	assert.Nil(t, err)
	assert.Equal(t, 1, len(commits))
	assert.Equal(t, "aSha", commits[0].SHA)
}
