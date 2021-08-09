package gitService

import "github.com/gimlet-io/gimlet-dashboard/model"

type GitService interface {
	FetchCommits(owner string, repo string, token string, hashesToFetch []string) ([]*model.Commit, error)
}