package server

import (
	"github.com/gimlet-io/gimlet-dashboard/cmd/dashboard/config"
	"github.com/gimlet-io/gimlet-dashboard/git/genericScm"
	"github.com/gimlet-io/gimlet-dashboard/git/nativeGit"
	"github.com/gimlet-io/go-scm/scm"
	"net/http"
)

// hook processes webhooks from SCMs
// converts it to go-scm objects
// writes to various tables
// triggers async data fetches
func hook(writer http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	goScmHelper, _ := ctx.Value("goScmHelper").(*genericScm.GoScmHelper)
	config, _ := ctx.Value("config").(*config.Config)
	gitRepoCache, _ := ctx.Value("gitRepoCache").(*nativeGit.RepoCache)

	webhook, err := goScmHelper.Parse(r, func(webhook scm.Webhook) (string, error) {
		return config.WebhookSecret, nil
	})
	if err != nil {
		if config.IsGithub() {
			if r.Header.Get("X-GitHub-Event") == "ping" {
				writer.WriteHeader(http.StatusOK)
				writer.Write([]byte("pong"))
			}
		}

		writer.WriteHeader(http.StatusBadRequest)
		return
	}

	switch webhook.(type) {
	case *scm.PushHook:
		processPushHook(webhook, gitRepoCache)
	case *scm.TagHook:
		processTagHook(webhook)
	case *scm.StatusHook:
		processStatusHook(webhook, gitRepoCache)
	case *scm.BranchHook:
		processBranchHook(webhook, gitRepoCache)
	}

	writer.WriteHeader(http.StatusOK)
}

func processPushHook(webhook scm.Webhook, repoCache *nativeGit.RepoCache) {
	owner := webhook.Repository().Namespace
	name := webhook.Repository().Name

	repoCache.Invalidate(scm.Join(owner, name))
}

func processTagHook(webhook scm.Webhook) {
}

func processStatusHook(webhook scm.Webhook, repoCache *nativeGit.RepoCache) {
	owner := webhook.Repository().Namespace
	name := webhook.Repository().Name

	repoCache.Invalidate(scm.Join(owner, name))
}

func processBranchHook(webhook scm.Webhook, repoCache *nativeGit.RepoCache) {
	owner := webhook.Repository().Namespace
	name := webhook.Repository().Name

	repoCache.Invalidate(scm.Join(owner, name))
}
