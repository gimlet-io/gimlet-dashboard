package server

import (
	"encoding/json"
	"fmt"
	"github.com/gimlet-io/gimlet-dashboard/gitService"
	"github.com/gimlet-io/gimlet-dashboard/model"
	"github.com/gimlet-io/gimlet-dashboard/store"
	"github.com/gimlet-io/go-scm/scm"
	"github.com/go-chi/chi"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/sirupsen/logrus"
	"net/http"
)

func commits(w http.ResponseWriter, r *http.Request) {
	owner := chi.URLParam(r, "owner")
	name := chi.URLParam(r, "name")
	repoName := fmt.Sprintf("%s/%s", owner, name)

	branch := r.URL.Query().Get("branch")
	if branch == "" {
		branch = "main"
	}

	ctx := r.Context()
	gitRepoCache, _ := ctx.Value("gitRepoCache").(*gitService.RepoCache)

	var repo *git.Repository
	if branch != "master" && branch != "main" {
		r, pathToClanUp, err := gitRepoCache.InstanceForWrite(repoName)
		defer gitRepoCache.CleanupWrittenRepo(pathToClanUp)
		if err != nil {
			logrus.Errorf("cannot get repo: %s", err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
		repo = r

		err = switchToBranch(repo, branch)
		if err != nil {
			logrus.Errorf("cannot switch to branch: %s", err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}

	} else {
		r, err := gitRepoCache.InstanceForRead(repoName)
		if err != nil {
			logrus.Errorf("cannot get repo: %s", err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
		repo = r
	}

	commitWalker, err := repo.Log(&git.LogOptions{})
	if err != nil {
		logrus.Errorf("cannot walk commits: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	limit := 10
	commits := []*Commit{}
	err = commitWalker.ForEach(func(c *object.Commit) error {
		if limit != 0 && len(commits) >= limit {
			return fmt.Errorf("%s", "LIMIT")
		}

		commits = append(commits, &Commit{
			SHA:        c.Hash.String(),
			AuthorName: c.Author.Name,
			Message:    c.Message,
			CreatedAt:  c.Author.When.Unix(),
		})

		return nil
	})
	if err != nil &&
		err.Error() != "EOF" &&
		err.Error() != "LIMIT" {
		logrus.Errorf("cannot walk commits: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	dao := ctx.Value("store").(*store.Store)
	commits, hashesToFetch, err := augmentCommits(repoName, commits, dao)
	if err != nil {
		logrus.Errorf("cannot augment commits: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	gitServiceImpl := ctx.Value("gitService").(gitService.GitService)
	tokenManager := ctx.Value("tokenManager").(gitService.NonImpersonatedTokenManager)
	token, _, _ := tokenManager.Token()
	go fetchCommits(owner, name, gitServiceImpl, token, dao, hashesToFetch)

	commitsString, err := json.Marshal(commits)
	if err != nil {
		logrus.Errorf("cannot serialize commits: %s", err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(commitsString)
}

// Commit represents a Github commit
type Commit struct {
	SHA        string               `json:"sha"`
	URL        string               `json:"url""`
	Author     string               `json:"author"`
	AuthorName string               `json:"authorName"`
	AuthorPic  string               `json:"author_pic"`
	Message    string               `json:"message"`
	CreatedAt  int64                `json:"created_at"`
	Tags       []string             `json:"tags,omitempty"`
	Status     model.CombinedStatus `json:"status,omitempty"`
}

func augmentCommits(repo string, commits []*Commit, dao *store.Store) ([]*Commit, []string, error) {
	var hashes []string
	for _, commit := range commits {
		hashes = append(hashes, commit.SHA)
	}

	dbCommits, err := dao.CommitsByRepoAndSHA(repo, hashes)
	if err != nil {
		return nil, nil, fmt.Errorf("cannot get commits from db %s", err)
	}

	dbCommitsByHash := map[string]*model.Commit{}
	for _, dbCommit := range dbCommits {
		dbCommitsByHash[dbCommit.SHA] = dbCommit
	}

	var augmentedCommits []*Commit
	var hashesToFetch []string
	for _, commit := range commits {
		if dbCommit, ok := dbCommitsByHash[commit.SHA]; ok {
			commit.URL = dbCommit.URL
			commit.Author = dbCommit.Author
			commit.AuthorPic = dbCommit.AuthorPic
			commit.Tags = dbCommit.Tags
			commit.Status = dbCommit.Status
		} else {
			hashesToFetch = append(hashesToFetch, commit.SHA)
		}

		augmentedCommits = append(augmentedCommits, commit)
	}

	return augmentedCommits, hashesToFetch, nil
}

func fetchCommits(
	owner string,
	repo string,
	gitService gitService.GitService,
	token string,
	store *store.Store,
	hashesToFetch []string,
) {
	if len(hashesToFetch) == 0 {
		return
	}

	commits, err := gitService.FetchCommits(owner, repo, token, hashesToFetch)
	if err != nil {
		logrus.Errorf("Could not fetch commits for %v, %v", repo, err)
		return
	}

	err = store.SaveCommits(scm.Join(owner, repo), commits)
	if err != nil {
		logrus.Errorf("Could not store commits for %v, %v", repo, err)
		return
	}
	statusOnCommits := map[string]*model.CombinedStatus{}
	for _, c := range commits {
		statusOnCommits[c.SHA] = &c.Status
	}

	if len(statusOnCommits) != 0 {
		err = store.SaveStatusesOnCommits(scm.Join(owner, repo), statusOnCommits)
		if err != nil {
			logrus.Errorf("Could not store status for %v, %v", repo, err)
			return
		}
	}

}
