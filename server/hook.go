package server

import (
	"bytes"
	"encoding/json"
	"github.com/gimlet-io/gimlet-dashboard/cmd/dashboard/config"
	"github.com/gimlet-io/gimlet-dashboard/git/customScm"
	"github.com/gimlet-io/gimlet-dashboard/git/genericScm"
	"github.com/gimlet-io/gimlet-dashboard/git/nativeGit"
	"github.com/gimlet-io/gimlet-dashboard/model"
	"github.com/gimlet-io/gimlet-dashboard/store"
	"github.com/gimlet-io/go-scm/scm"
	"github.com/sirupsen/logrus"
	"io"
	"io/ioutil"
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

	// duplicating request body as we exhaust it twice
	buf, _ := ioutil.ReadAll(r.Body)
	r.Body = ioutil.NopCloser(bytes.NewBuffer(buf))

	webhook, err := goScmHelper.Parse(r, func(webhook scm.Webhook) (string, error) {
		return config.WebhookSecret, nil
	})
	if err != nil {
		if config.IsGithub() {
			if r.Header.Get("X-GitHub-Event") == "ping" {
				writer.WriteHeader(http.StatusOK)
				writer.Write([]byte("pong"))
				return
			}
			if r.Header.Get("X-GitHub-Event") == "check_run" { // not handled by go-scm, parsing github actions manually
				dao := ctx.Value("store").(*store.Store)
				tokenManager := ctx.Value("tokenManager").(customScm.NonImpersonatedTokenManager)
				token, _, _ := tokenManager.Token()

				r.Body = ioutil.NopCloser(bytes.NewBuffer(buf))
				data, err := ioutil.ReadAll(
					io.LimitReader(r.Body, 10000000),
				)
				if err != nil {
					logrus.Errorf("could not get parse webhook body: %s", err)
					writer.WriteHeader(http.StatusInternalServerError)
					return
				}

				dst := new(checkRunHook)
				err = json.Unmarshal(data, dst)
				if err != nil {
					logrus.Errorf("could not parse webhook: %s", err)
					writer.WriteHeader(http.StatusInternalServerError)
					return
				}

				// check run is not a hook:
				// https://dev.to/gr2m/github-api-how-to-retrieve-the-combined-pull-request-status-from-commit-statuses-check-runs-and-github-action-results-2cen
				processStatusHook(dst.Repository.Owner.Login, dst.Repository.Name, dst.CheckRun.HeadSHA, gitRepoCache, goScmHelper, token, dao)

				writer.WriteHeader(http.StatusOK)
				return
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
		dao := ctx.Value("store").(*store.Store)
		tokenManager := ctx.Value("tokenManager").(customScm.NonImpersonatedTokenManager)
		token, _, _ := tokenManager.Token()

		owner := webhook.Repository().Namespace
		name := webhook.Repository().Name
		w := webhook.(*scm.StatusHook)

		processStatusHook(owner, name, w.SHA, gitRepoCache, goScmHelper, token, dao)
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

func processStatusHook(
	owner string,
	name string,
	sha string,
	repoCache *nativeGit.RepoCache,
	goScmHelper *genericScm.GoScmHelper,
	token string,
	dao *store.Store,
) {
	repo := scm.Join(owner, name)
	gitStatuses, err := goScmHelper.Statuses(owner, name, sha, token)
	if err != nil {
		logrus.Warnf("could not get status upon status webhook %s - %v", sha, err)
	}

	var statuses []model.Status
	for _, s := range gitStatuses {
		statuses = append(statuses, model.Status{
			State:       convertFromState(s.State),
			Context:     s.Label,
			TargetUrl:   s.Target,
			Description: s.Desc,
		})
	}
	err = dao.SaveStatusesOnCommits(repo, map[string]*model.CombinedStatus{
		sha: {
			Contexts: statuses,
		},
	})
	if err != nil {
		logrus.Errorf("could not store status for %v, %v", repo, err)
		return
	}

	repoCache.Invalidate(scm.Join(owner, name))
}

func convertFromState(from scm.State) string {
	switch from {
	case scm.StatePending, scm.StateRunning:
		return "PENDING"
	case scm.StateSuccess:
		return "SUCCESS"
	case scm.StateFailure:
		return "FAILURE"
	default:
		return "ERROR"
	}
}

func processBranchHook(webhook scm.Webhook, repoCache *nativeGit.RepoCache) {
	owner := webhook.Repository().Namespace
	name := webhook.Repository().Name

	repoCache.Invalidate(scm.Join(owner, name))
}

type checkRunHook struct {
	CheckRun struct {
		HeadSHA string `json:"head_sha"`
	} `json:"check_run"`
	Repository struct {
		ID    int64 `json:"id"`
		Owner struct {
			Login     string `json:"login"`
			AvatarURL string `json:"avatar_url"`
		} `json:"owner"`
		Name          string `json:"name"`
		FullName      string `json:"full_name"`
	} `json:"repository"`
}
