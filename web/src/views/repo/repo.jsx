import React, {Component} from 'react';
import ServiceDetail from "../../components/serviceDetail/serviceDetail";
import {
  ACTION_TYPE_BRANCHES,
  ACTION_TYPE_COMMITS,
  ACTION_TYPE_DEPLOY, ACTION_TYPE_DEPLOY_STATUS,
  ACTION_TYPE_ROLLOUT_HISTORY
} from "../../redux/redux";
import {Commits} from "../../components/commits/commits";
import Dropdown from "../../components/dropdown/dropdown";

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
      refreshQueue: reduxState.repoRefreshQueue.filter(repo => repo === `${owner}/${repo}`).length
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
        if ( prevState.refreshQueueLength !== queueLength) {
          this.refreshBranches(owner, repo);
          this.refreshCommits(owner, repo, prevState.selectedBranch);
        }
        return {refreshQueueLength: queueLength}
      });
    });

    this.branchChange = this.branchChange.bind(this)
    this.deploy = this.deploy.bind(this)
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
          for(let gitopsHash of Object.keys(data.gitopsHashes)) {
            if (data.gitopsHashes[gitopsHash].status === 'N/A') { // poll until all gitops writes are applied
              setTimeout(() => {
                this.checkDeployStatus(deployRequest);
              }, 500);
            }
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

  render() {
    const {owner, repo} = this.props.match.params;
    const repoName = `${owner}/${repo}`
    let {envs, search, rolloutHistory, commits} = this.state;
    const {branches, selectedBranch} = this.state;

    let filteredEnvs = {};
    for (const envName of Object.keys(envs)) {
      const env = envs[envName];
      filteredEnvs[env.name] = {name: env.name, stacks: env.stacks};
      filteredEnvs[env.name].stacks = env.stacks.filter((service) => {
        return service.repo === repoName
      });
      if (search.filter !== '') {
        console.log(filteredEnvs[env.name])
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
      (<p className="text-xs text-gray-800">No services</p>);

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
                      />
                    )
                  })

                  return (
                    <div>
                      <h4 className="text-xl font-medium capitalize leading-tight text-gray-900 my-4">{envName}</h4>
                      <div class="bg-white shadow divide-y divide-gray-200 p-4 sm:p-6 lg:p-8">
                        {renderedServices.length > 0 ? renderedServices : emptyState}
                      </div>
                      <div class="bg-gray-50 shadow p-4 sm:p-6 lg:p-8 mt-8 relative">
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
                  )
                })
                }
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }
}
