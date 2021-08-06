import React, {Component} from 'react';
import ServiceDetail from "../../components/serviceDetail/serviceDetail";
import {ACTION_TYPE_COMMITS, ACTION_TYPE_ROLLOUT_HISTORY} from "../../redux/redux";
import {Commits} from "../../components/commits/commits";

export default class Repo extends Component {
  constructor(props) {
    super(props);

    // default state
    let reduxState = this.props.store.getState();
    this.state = {
      envs: reduxState.envs,
      search: reduxState.search,
      rolloutHistory: reduxState.rolloutHistory,
      commits: reduxState.commits
    }

    // handling API and streaming state changes
    this.props.store.subscribe(() => {
      let reduxState = this.props.store.getState();

      this.setState({envs: reduxState.envs});
      this.setState({search: reduxState.search});
      this.setState({rolloutHistory: reduxState.rolloutHistory});
      this.setState({commits: reduxState.commits});
    });
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

    this.props.gimletClient.getCommits(owner, repo)
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

  render() {
    const {owner, repo} = this.props.match.params;
    const repoName = `${owner}/${repo}`
    let {envs, search, rolloutHistory, commits} = this.state;

    let filteredEnvs = {};
    for (const envName of Object.keys(envs)) {
      const env = envs[envName];
      filteredEnvs[env.name] = {name: env.name, stacks: env.stacks};
      filteredEnvs[env.name].stacks = env.stacks.filter((service) => {
        return service.repo === repoName
      });
      if (search.filter !== '') {
        filteredEnvs[env.name].stacks = filteredEnvs.stacks.filter((service) => {
          return service.service.name.includes(search.filter) ||
            (service.deployment !== undefined && service.deployment.name.includes(search.filter)) ||
            (service.ingresses !== undefined && service.ingresses.filter((ingress) => ingress.url.includes(search.filter)).length > 0)
        })
      }
    }

    if (commits && commits[repoName]) {
      console.log(commits[repoName])
    }

    return (
      <div>
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">{repoName}</h1>
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
                    if (rolloutHistory && rolloutHistory[service.repo]) {
                      appRolloutHistory = rolloutHistory[service.repo][envName][service.service.name]
                    }

                    return (
                      <ServiceDetail key={service.service.name} service={service} rolloutHistory={appRolloutHistory}/>
                    )
                  })

                  return (
                    <div>
                      <h4 className="text-xl font-medium capitalize leading-tight text-gray-900 my-4">{envName}</h4>
                      <div class="bg-white shadow divide-y divide-gray-200">
                        {renderedServices.length > 0 ? renderedServices : (
                          <p className="text-xs text-gray-800">No services deployed from the repo</p>)}
                      </div>
                      <div class="bg-gray-50 shadow p-4 sm:p-6 lg:p-8 mt-8">
                        {commits &&
                        <Commits commits={commits[repoName]}/>
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