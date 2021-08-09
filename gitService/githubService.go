package gitService

import (
	"context"
	"github.com/gimlet-io/gimlet-dashboard/model"
	"github.com/shurcooL/githubv4"
	"golang.org/x/oauth2"
	"time"
)

type GithubClient struct {
}

// FetchCommits fetches Github commits and their statuses
/* Getting all branches
query {
  repository(owner: "gimlet-io", name: "fosdem-2021") {
    refs(first: 10, , refPrefix:"refs/heads/") {
      nodes {
        name
      }
    }
  }
}
*/

/* Getting all tags
query {
  repository(owner: "gimlet-io", name: "fosdem-2021") {
    refs(first: 10, , refPrefix:"refs/heads/") {
      nodes {
        name
      }
    }
  }
}
*/

/* Getting multiple commits by hash
query {
  viewer {
    login
  }
  rateLimit {
    limit
    cost
    remaining
    resetAt
  }
  repository(owner: "laszlocph", name: "aedes") {
     a: object(oid: "25a913a5e052d3f5b9c4880377542f3ed8389d2b") {
      ... on Commit {
        oid
        message
        authoredDate
        status {
          state
          contexts {
            context
            createdAt
            state
            targetUrl
          }
        }
      }
    }
    b: object(oid: "3396bc4fae754b5f55de23f49f973ddca70295d7") {
      ... on Commit {
        oid
        message
        authoredDate
        status {
          state
          contexts {
            context
            createdAt
            state
            targetUrl
          }
        }
      }
    }
  }
}
 */

/* Commits with tags(?)
query {
  repository(owner: "laszlocph", name: "aedes") {
    refs(refPrefix:"refs/tags/", first: 100){
      nodes {
        name
        target {
          ... on Commit {
            oid
          }
        }
      }
    }
    ref(qualifiedName:"refs/heads/master"){
      target{
        ... on Commit {
          committedDate
          history(first:10){
            nodes {
              oid
              message
              authoredDate
              status {
                state
                contexts {
                  context
                  createdAt
                  state
                  targetUrl
                }
              }
            }
          }
        }
      }
    }
  }
}
*/
func (c *GithubClient) FetchCommits(owner string, repo string, token string) ([]*model.Commit, error) {
	src := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: token},
	)
	httpClient := oauth2.NewClient(context.Background(), src)
	graphQLClient := githubv4.NewClient(httpClient)

	type ctx struct {
		Context     string
		CreatedAt   string
		State       string
		TargetUrl   string
		Description string
	}

	type commit struct {
		Message      string
		AuthoredDate string
		URL          string
		OID          string
		Author       struct {
			User struct {
				Login     string
				AvatarURL string
			}
		}
		Status struct {
			State    string
			Contexts []ctx
		}
	}

	type ref struct {
		Target struct {
			Commit struct {
				History struct {
					Nodes []commit
				} `graphql:"history(first: 100)"`
			} `graphql:"... on Commit"`
		}
	}

	var query3 struct {
		Repository struct {
			Ref  ref  `graphql:"ref(qualifiedName:\"refs/heads/master\")"`
		} `graphql:"repository(owner: $owner, name: $name)"`
	}

	var query3Main struct {
		Repository struct {
			Ref  ref  `graphql:"ref(qualifiedName:\"refs/heads/main\")"`
		} `graphql:"repository(owner: $owner, name: $name)"`
	}

	variables := map[string]interface{}{
		"owner": githubv4.String(owner),
		"name":  githubv4.String(repo),
	}

	err := graphQLClient.Query(context.Background(), &query3, variables)
	if err != nil {
		return nil, err
	}
	nodes := query3.Repository.Ref.Target.Commit.History.Nodes

	if len(nodes) == 0 {
		err := graphQLClient.Query(context.Background(), &query3Main, variables)
		if err != nil {
			return nil, err
		}
		nodes = query3Main.Repository.Ref.Target.Commit.History.Nodes
	}

	commits := []*model.Commit{}
	for _, commit := range nodes {
		contexts := []model.Status{}
		for _, c := range commit.Status.Contexts {
			contexts = append(contexts, model.Status{
				State:       c.State,
				Context:     c.Context,
				CreatedAt:   c.CreatedAt,
				TargetUrl:   c.TargetUrl,
				Description: c.Description,
			})
		}

		createdAt, err := time.Parse(time.RFC3339, commit.AuthoredDate)
		if err != nil {
			return nil, err
		}

		commits = append(commits, &model.Commit{
			SHA:       commit.OID,
			Message:   commit.Message,
			Repo:      owner + "/" + repo,
			CreatedAt: createdAt.Unix(),
			Author:    commit.Author.User.Login,
			AuthorPic: commit.Author.User.AvatarURL,
			URL:       commit.URL,
			Status: model.CombinedStatus{
				State:    commit.Status.State,
				Contexts: contexts,
			},
		})
	}

	return commits, nil
}
