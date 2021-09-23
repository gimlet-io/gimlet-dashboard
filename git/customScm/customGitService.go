package customScm

import "github.com/gimlet-io/gimlet-dashboard/model"

type CustomGitService interface {
	FetchCommits(owner string, repo string, token string, hashesToFetch []string) ([]*model.Commit, error)
	OrgRepos(installationToken string) ([]string, error)
}
