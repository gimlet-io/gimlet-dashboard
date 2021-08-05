package goScmHelper

import (
	"context"
	"crypto/tls"
	"github.com/gimlet-io/gimlet-dashboard/cmd/dashboard/config"
	"github.com/gimlet-io/go-scm/scm"
	"github.com/gimlet-io/go-scm/scm/driver/github"
	"github.com/gimlet-io/go-scm/scm/transport/oauth2"
	"github.com/sirupsen/logrus"
	"net/http"
	"net/http/httputil"
)

type GoScmHelper struct {
	client *scm.Client
}

func NewGoScmHelper(config *config.Config) *GoScmHelper {
	client, err := github.New("https://api.github.com")
	if err != nil {
		logrus.WithError(err).
			Fatalln("main: cannot create the GitHub client")
	}
	if config.Github.Debug {
		client.DumpResponse = httputil.DumpResponse
	}
	client.Client = &http.Client{
		Transport: &oauth2.Transport{
			Source: oauth2.ContextTokenSource(),
			Base:   defaultTransport(config.Github.SkipVerify),
		},
	}

	return &GoScmHelper{
		client: client,
	}
}

// defaultTransport provides a default http.Transport. If
// skipVerify is true, the transport will skip ssl verification.
func defaultTransport(skipVerify bool) http.RoundTripper {
	return &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: skipVerify,
		},
	}
}

func (helper *GoScmHelper) Parse(req *http.Request, fn scm.SecretFunc) (scm.Webhook, error) {
	return helper.client.Webhooks.Parse(req, fn)
}

func (helper *GoScmHelper) UserRepos(accessToken string, refreshToken string) ([]string, error) {
	var repos []string

	ctx := context.WithValue(context.Background(), scm.TokenKey{}, &scm.Token{
		Token:   accessToken,
		Refresh: refreshToken,
	})

	opts := scm.ListOptions{Size: 100}
	for {
		scmRepos, meta, err := helper.client.Repositories.List(ctx, opts)
		if err != nil {
			return []string{}, err
		}
		for _, repo := range scmRepos {
			repos = append(repos, repo.Namespace+"/"+repo.Name)
		}

		opts.Page = meta.Page.Next
		opts.URL = meta.Page.NextURL

		if opts.Page == 0 && opts.URL == "" {
			break
		}
	}

	return repos, nil
}

func (helper *GoScmHelper) User(accessToken string, refreshToken string) (*scm.User, error) {
	ctx := context.WithValue(context.Background(), scm.TokenKey{}, &scm.Token{
		Token:   accessToken,
		Refresh: refreshToken,
	})
	user, _, err := helper.client.Users.Find(ctx)
	return user, err
}

func (helper *GoScmHelper) Organizations(accessToken string, refreshToken string) ([]*scm.Organization, error) {
	ctx := context.WithValue(context.Background(), scm.TokenKey{}, &scm.Token{
		Token:   accessToken,
		Refresh: refreshToken,
	})
	organizations, _, err := helper.client.Organizations.List(ctx, scm.ListOptions{
		Size: 50,
	})

	return organizations, err
}

func (helper *GoScmHelper) Tags(owner string, name string, token string) ([]*scm.Reference, error) {
	ctx := context.WithValue(context.Background(), scm.TokenKey{}, &scm.Token{
		Token:   token,
		Refresh: "",
	})

	tags, _, err := helper.client.Git.ListTags(ctx, scm.Join(owner, name), scm.ListOptions{Size: 50})
	if err != nil {
		return nil, err
	}

	return tags, nil
}

func (helper *GoScmHelper) Branches(owner string, name string, token string) ([]string, error) {
	var result []string

	ctx := context.WithValue(context.Background(), scm.TokenKey{}, &scm.Token{
		Token:   token,
		Refresh: "",
	})

	opts := scm.ListOptions{Size: 100}
	for {
		branches, meta, err := helper.client.Git.ListBranches(ctx, scm.Join(owner, name), opts)
		if err != nil {
			return []string{}, err
		}
		for _, branch := range branches {
			result = append(result, branch.Name)
		}

		opts.Page = meta.Page.Next
		opts.URL = meta.Page.NextURL

		if opts.Page == 0 && opts.URL == "" {
			break
		}
	}

	return result, nil
}

func (helper *GoScmHelper) RegisterWebhook(
	host string,
	token string,
	webhookSecret string,
	owner string,
	repo string,
) error {
	ctx := context.WithValue(context.Background(), scm.TokenKey{}, &scm.Token{
		Token:   token,
		Refresh: "",
	})

	hook := &scm.HookInput{
		Name:   "Gimlet Dashboard",
		Target: host + "/hook",
		Secret: webhookSecret,
		Events: scm.HookEvents{
			Push:   true,
			Status: true,
			Branch: true,
		},
	}

	return replaceHook(ctx, helper.client, scm.Join(owner, repo), hook)
}
