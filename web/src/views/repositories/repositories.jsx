import React, {Component} from 'react';
import RepoCard from "../../components/repoCard/repoCard";

export default class Repositories extends Component {
  constructor(props) {
    super(props);

    // default state
    let reduxState = this.props.store.getState();
    this.state = {
      repositories: this.mapToRepositories(reduxState.envs),
      search: reduxState.search
    }

    // handling API and streaming state changes
    this.props.store.subscribe(() => {
      let reduxState = this.props.store.getState();

      this.setState({repositories: this.mapToRepositories(reduxState.envs)});
      this.setState({search: reduxState.search});
    });

    this.navigateToRepo = this.navigateToRepo.bind(this);
  }

  mapToRepositories(envs) {
    const repositories = {}

    for (const envName of Object.keys(envs)) {
      const env = envs[envName];

      for (const service of env.stacks) {
        if (repositories[service.repo] === undefined) {
          repositories[service.repo] = [];
        }

        repositories[service.repo].push(service);
      }
    }

    return repositories;
  }

  navigateToRepo(repo) {
    this.props.history.push(`/repo/${repo}`)
  }

  render() {
    const {repositories, search} = this.state;

    let filteredRepositories = {};
    for (const repoName of Object.keys(repositories)) {
      filteredRepositories[repoName] = repositories[repoName];
      if (search.filter !== '') {
        filteredRepositories[repoName] = filteredRepositories[repoName].filter((service) => {
          return service.service.name.includes(search.filter) ||
            (service.deployment !== undefined && service.deployment.name.includes(search.filter)) ||
            (service.ingresses !== undefined && service.ingresses.filter((ingress) => ingress.url.includes(search.filter)).length > 0)
        })
        if (filteredRepositories[repoName].length === 0) {
          delete filteredRepositories[repoName];
        }
      }
    }

    const filteredRepoNames = Object.keys(filteredRepositories);
    filteredRepoNames.sort();
    const repoCards = filteredRepoNames.map(repoName => {
      return (
        <li key={repoName} className="col-span-1 bg-white rounded-lg shadow divide-y divide-gray-200">
          <RepoCard
            name={repoName}
            services={filteredRepositories[repoName]}
            navigateToRepo={this.navigateToRepo}
          />
        </li>
      )
    })

    const emptyState = search.filter !== '' ?
      (<p className="text-xs text-gray-800">No service matches the search</p>)
      :
      (<p className="text-xs text-gray-800">No services</p>);

    return (
      <div>
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">Repositories</h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {repoCards.length > 0 ? repoCards : emptyState}
              </ul>
            </div>
          </div>
        </main>
      </div>
    )
  }

}
