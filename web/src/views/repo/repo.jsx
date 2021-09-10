import React, {Component} from 'react';
import ServiceDetail from "../../components/serviceDetail/serviceDetail";
import {
  ACTION_TYPE_BRANCHES,
  ACTION_TYPE_COMMITS,
  ACTION_TYPE_DEPLOY,
  ACTION_TYPE_DEPLOY_STATUS,
  ACTION_TYPE_ROLLOUT_HISTORY
} from "../../redux/redux";
import {Commits} from "../../components/commits/commits";
import Dropdown from "../../components/dropdown/dropdown";
import {emptyStateNoAgents} from "../services/services";

export default class Repo extends Component {
  constructor(props) {
    super(props);

    const {owner, repo} = this.props.match.params;

    // default state
    let reduxState = this.props.store.getState();
    this.state = {
      envs: reduxState.envs,
      search: reduxState.search,
      rolloutHistory: reduxState.rolloutHistory,
      commits: reduxState.commits,
      branches: reduxState.branches,
      selectedBranch: '',
      settings: reduxState.settings,
      refreshQueue: reduxState.repoRefreshQueue.filter(repo => repo === `${owner}/${repo}`).length,
      agents: reduxState.settings.agents
    }

    // handling API and streaming state changes
    this.props.store.subscribe(() => {
      let reduxState = this.props.store.getState();

      this.setState({envs: reduxState.envs});
      this.setState({search: reduxState.search});
      this.setState({rolloutHistory: reduxState.rolloutHistory});
      this.setState({commits: reduxState.commits});
      this.setState({branches: reduxState.branches});

      const queueLength = reduxState.repoRefreshQueue.filter(r => r === `${owner}/${repo}`).length
      this.setState(prevState => {
        if (prevState.refreshQueueLength !== queueLength) {
          this.refreshBranches(owner, repo);
          this.refreshCommits(owner, repo, prevState.selectedBranch);
        }
        return {refreshQueueLength: queueLength}
      });
      this.setState({agents: reduxState.settings.agents});
    });

    this.branchChange = this.branchChange.bind(this)
    this.deploy = this.deploy.bind(this)
    this.rollback = this.rollback.bind(this)
    this.checkDeployStatus = this.checkDeployStatus.bind(this)
  }

  componentDidMount() {
    const {owner, repo} = this.props.match.params;

    this.props.gimletClient.getRolloutHistory(owner, repo)
      .then(data => {
        this.props.store.dispatch({
          type: ACTION_TYPE_ROLLOUT_HISTORY, payload: {
            owner: owner,
            repo: repo,
            releases: data
          }
        });
      }, () => {/* Generic error handler deals with it */
      });

    this.props.gimletClient.getBranches(owner, repo)
      .then(data => {
        let defaultBranch = 'main'
        for (let branch of data) {
          if (branch === "master") {
            defaultBranch = "master";
          }
        }

        this.branchChange(defaultBranch)
        return data;
      })
      .then(data => {
        this.props.store.dispatch({
          type: ACTION_TYPE_BRANCHES, payload: {
            owner: owner,
            repo: repo,
            branches: data
          }
        });
      }, () => {/* Generic error handler deals with it */
      });
  }

  refreshBranches(owner, repo) {
    this.props.gimletClient.getBranches(owner, repo)
      .then(data => {
        this.props.store.dispatch({
          type: ACTION_TYPE_BRANCHES, payload: {
            owner: owner,
            repo: repo,
            branches: data
          }
        });
      }, () => {/* Generic error handler deals with it */
      });
  }

  refreshCommits(owner, repo, branch) {
    this.props.gimletClient.getCommits(owner, repo, branch)
      .then(data => {
        this.props.store.dispatch({
          type: ACTION_TYPE_COMMITS, payload: {
            owner: owner,
            repo: repo,
            commits: data
          }
        });
      }, () => {/* Generic error handler deals with it */
      });
  }

  branchChange(newBranch) {
    if (newBranch === '') {
      return
    }

    const {owner, repo} = this.props.match.params;
    const {selectedBranch} = this.state;

    if (newBranch !== selectedBranch) {
      this.setState({selectedBranch: newBranch});

      this.props.gimletClient.getCommits(owner, repo, newBranch)
        .then(data => {
          this.props.store.dispatch({
            type: ACTION_TYPE_COMMITS, payload: {
              owner: owner,
              repo: repo,
              commits: data
            }
          });
        }, () => {/* Generic error handler deals with it */
        });
    }
  }

  checkDeployStatus(deployRequest) {
    const {owner, repo} = this.props.match.params;

    this.props.gimletClient.getDeployStatus(deployRequest.trackingId)
      .then(data => {
        deployRequest.status = data.status;
        deployRequest.statusDesc = data.statusDesc;
        deployRequest.gitopsHashes = data.gitopsHashes;
        this.props.store.dispatch({
          type: ACTION_TYPE_DEPLOY_STATUS, payload: deployRequest
        });

        if (data.status === "new") {
          setTimeout(() => {
            this.checkDeployStatus(deployRequest);
          }, 500);
        }

        if (data.status === "processed") {
          let gitopsCommitsApplied = true;
          for (let gitopsHash of Object.keys(data.gitopsHashes)) {
            if (data.gitopsHashes[gitopsHash].status === 'N/A' ||
              data.gitopsHashes[gitopsHash].status === 'Progressing') { // poll until all gitops writes are applied
              gitopsCommitsApplied = false;
              setTimeout(() => {
                this.checkDeployStatus(deployRequest);
              }, 500);
            }
          }
          if (gitopsCommitsApplied) {
            this.props.gimletClient.getRolloutHistory(owner, repo)
              .then(data => {
                this.props.store.dispatch({
                  type: ACTION_TYPE_ROLLOUT_HISTORY, payload: {
                    owner: owner,
                    repo: repo,
                    releases: data
                  }
                });
              }, () => {/* Generic error handler deals with it */
              });
          }
        }
      }, () => {/* Generic error handler deals with it */
      });
  }

  deploy(target, sha, repo) {
    this.props.gimletClient.deploy(target.artifactId, target.env, target.app)
      .then(data => {
        target.sha = sha;
        target.trackingId = data.trackingId;
        setTimeout(() => {
          this.checkDeployStatus(target);
        }, 500);
      }, () => {/* Generic error handler deals with it */
      });

    target.sha = sha;
    target.repo = repo;
    this.props.store.dispatch({
      type: ACTION_TYPE_DEPLOY, payload: target
    });
  }

  rollback(env, app, rollbackTo, e) {
    const target = {
      rollback: true,
      app: app,
      env: env,
    };
    this.props.gimletClient.rollback(env, app, rollbackTo)
      .then(data => {
        // target.sha = sha;
        target.trackingId = data.trackingId;
        setTimeout(() => {
          this.checkDeployStatus(target);
        }, 500);
      }, () => {/* Generic error handler deals with it */
      });

    // target.sha = sha;
    // target.repo = repo;
    this.props.store.dispatch({
      type: ACTION_TYPE_DEPLOY, payload: target
    });
  }

  render() {
    const {owner, repo} = this.props.match.params;
    const repoName = `${owner}/${repo}`
    let {envs, search, rolloutHistory, commits, agents} = this.state;
    const {branches, selectedBranch} = this.state;

    let filteredEnvs = {};
    for (const envName of Object.keys(envs)) {
      const env = envs[envName];
      filteredEnvs[env.name] = {name: env.name, stacks: env.stacks};
      filteredEnvs[env.name].stacks = env.stacks.filter((service) => {
        return service.repo === repoName
      });
      if (search.filter !== '') {
        filteredEnvs[env.name].stacks = filteredEnvs[env.name].stacks.filter((service) => {
          return service.service.name.includes(search.filter) ||
            (service.deployment !== undefined && service.deployment.name.includes(search.filter)) ||
            (service.ingresses !== undefined && service.ingresses.filter((ingress) => ingress.url.includes(search.filter)).length > 0)
        })
      }
    }

    const emptyState = search.filter !== '' ?
      (<p className="text-xs text-gray-800">No service matches the search</p>)
      :
      emptyStateDeployThisRepo();

    let repoRolloutHistory = undefined;
    if (rolloutHistory && rolloutHistory[repoName]) {
      repoRolloutHistory = rolloutHistory[repoName]
    }

    return (
      <div>
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">{repoName}
              <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer">
                <svg xmlns="http://www.w3.org/2000/svg"
                     className="inline fill-current text-gray-500 hover:text-gray-700 ml-1" width="12" height="12"
                     viewBox="0 0 24 24">
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path
                    d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                </svg>
              </a>
            </h1>
            <button class="text-gray-500 hover:text-gray-700" onClick={() => this.props.history.goBack()}>
              &laquo; back
            </button>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <div>
                {agents.length === 0 &&
                <div class="mt-8 mb-16">
                  {emptyStateNoAgents()}
                </div>
                }

                {Object.keys(filteredEnvs).map((envName) => {
                  const env = filteredEnvs[envName];
                  const renderedServices = env.stacks.map((service) => {
                    let appRolloutHistory = undefined;
                    if (repoRolloutHistory) {
                      appRolloutHistory = repoRolloutHistory[envName][service.service.name]
                    }

                    return (
                      <ServiceDetail
                        key={service.service.name}
                        service={service}
                        rolloutHistory={appRolloutHistory}
                        rollback={this.rollback}
                      />
                    )
                  })

                  return (
                    <div>
                      <h4 className="text-xl font-medium capitalize leading-tight text-gray-900 my-4">{envName}</h4>
                      <div class="bg-white shadow divide-y divide-gray-200 p-4 sm:p-6 lg:p-8">
                        {renderedServices.length > 0 ? renderedServices : emptyState}
                      </div>
                    </div>
                  )
                })
                }
                <div className="bg-gray-50 shadow p-4 sm:p-6 lg:p-8 mt-8 relative">
                  <div className="w-64 mb-4 lg:mb-8">
                    {branches &&
                    <Dropdown
                      items={branches[repoName]}
                      value={selectedBranch}
                      changeHandler={(newBranch) => this.branchChange(newBranch)}
                    />
                    }
                  </div>
                  {commits &&
                  <Commits
                    commits={commits[repoName]}
                    envs={filteredEnvs}
                    rolloutHistory={repoRolloutHistory}
                    deployHandler={this.deploy}
                    repo={repoName}
                  />
                  }
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }
}

function emptyStateDeployThisRepo() {
  return <a
    href="https://gimlet.io/gimlet-cli/manage-environments-with-gimlet-and-gitops/"
    target="_blank"
    rel="noreferrer"
    className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto h-12 w-12 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
    <span className="mt-2 block text-sm font-bold text-gray-500">
                            Deploy this repository
                          </span>
  </a>
}