package gitService

import (
	"fmt"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/transport/http"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const Dir_RWX_RX_R = 0754

type RepoCache struct {
	tokenManager NonImpersonatedTokenManager
	repos        map[string]*git.Repository
	stopCh       chan struct{}
	invalidateCh chan string
	cachePath    string
}

func NewRepoCache(
	tokenManager NonImpersonatedTokenManager,
	stopCh chan struct{},
	cachePath string,
) (*RepoCache, error) {
	repoCache := &RepoCache{
		tokenManager: tokenManager,
		repos:        map[string]*git.Repository{},
		stopCh:       stopCh,
		invalidateCh: make(chan string),
		cachePath:    cachePath,
	}

	paths, err := os.ReadDir(cachePath)
	if err != nil {
		return nil, fmt.Errorf("cannot list files: %s", err)
	}

	for _, fileInfo := range paths {
		if !fileInfo.IsDir() {
			continue
		}

		path := filepath.Join(cachePath, fileInfo.Name())
		repo, err := git.PlainOpen(path)
		if err != nil {
			return nil, fmt.Errorf("cannot open git repository at %s: %s", path, err)
		}

		repoCache.repos[strings.ReplaceAll(fileInfo.Name(), "%", "/")] = repo
	}

	return repoCache, nil
}

func (r *RepoCache) Run() {
	for {
		for repoName, _ := range r.repos {
			r.syncGitRepo(repoName)
		}

		select {
		case <-r.stopCh:
			logrus.Info("stopping")
			return
		case repoName := <-r.invalidateCh:
			logrus.Infof("received cache invalidate message for %s", repoName)
			r.syncGitRepo(repoName)
		case <-time.After(30 * time.Second):
		}
	}
}

func (r *RepoCache) syncGitRepo(repoName string) {
	hasChanges, err := r.remoteHasChanges(repoName)

	if hasChanges || err != nil {
		logrus.Info("repo cache is stale, updating")
		err := r.updateRepo(repoName)
		if err != nil {
			logrus.Errorf("could not update git repo %s", err)
		}
	}
}

func (r *RepoCache) updateRepo(repoName string) error {
	token, user, err := r.tokenManager.Token()
	if err != nil {
		return errors.WithMessage(err, "couldn't get scm token")
	}

	worktree, err := r.repos[repoName].Worktree()

	return worktree.Pull(&git.PullOptions{
		RemoteName: "origin",
		Auth: &http.BasicAuth{
			Username: user,
			Password: token,
		},
	})
}

func (r *RepoCache) InstanceForRead(repoName string) (*git.Repository, error) {
	if repo, ok := r.repos[repoName]; ok {
		return repo, nil
	}

	return r.clone(repoName)
}

func (r *RepoCache) Invalidate(repoName string) {
	r.invalidateCh <- repoName
}

func (r *RepoCache) clone(repoName string) (*git.Repository, error) {
	repoPath := filepath.Join(r.cachePath, strings.ReplaceAll(repoName, "/", "%"))

	err := os.MkdirAll(repoPath, Dir_RWX_RX_R)
	if err != nil {
		return nil, errors.WithMessage(err, "couldn't create folder")
	}

	token, user, err := r.tokenManager.Token()
	if err != nil {
		return nil, errors.WithMessage(err, "couldn't get scm token")
	}

	opts := &git.CloneOptions{
		URL: fmt.Sprintf("%s/%s", "https://github.com", repoName),
		Auth: &http.BasicAuth{
			Username: user,
			Password: token,
		},
		Depth: 100,
	}

	repo, err := git.PlainClone(repoPath, false, opts)
	if err != nil {
		return nil, errors.WithMessage(err, "couldn't clone")
	}

	r.repos[repoName] = repo
	return repo, nil
}

func (r *RepoCache) remoteHasChanges(repoName string) (bool, error) {
	token, user, err := r.tokenManager.Token()
	if err != nil {
		return false, errors.WithMessage(err, "couldn't get scm token")
	}

	err = r.repos[repoName].Fetch(&git.FetchOptions{
		//RefSpecs: []config.RefSpec{"refs/*:refs/*", "HEAD:refs/heads/HEAD"},
		Auth: &http.BasicAuth{
			Username: user,
			Password: token,
		},
	})
	if err == git.NoErrAlreadyUpToDate {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}
