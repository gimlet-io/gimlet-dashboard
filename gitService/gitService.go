package gitService

import "github.com/gimlet-io/gimlet-dashboard/model"

type GitService interface {
	FetchCommits(owner string, repo string, token string) ([]*model.Commit, error)
}