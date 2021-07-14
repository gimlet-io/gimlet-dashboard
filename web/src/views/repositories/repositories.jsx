import React, {Component} from 'react';
import RepoCard from "../../components/repoCard/repoCard";

export default class Repositories extends Component {
  constructor(props) {
    super(props);

    // default state
    let reduxState = this.props.store.getState();
    this.state = {
      repositories: this.mapToRepositories(reduxState.envs)
    }

    // handling API and streaming state changes
    this.props.store.subscribe(() => {
      let reduxState = this.props.store.getState();

      this.setState({repositories: this.mapToRepositories(reduxState.envs)});
    });
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

  render() {
    const {repositories} = this.state;

    let repoNames = Object.keys(repositories);
    repoNames.sort();
    const repoCards = repoNames.map(repoName => {
      return (
        <li key={repoName} className="col-span-1 bg-white rounded-lg shadow divide-y divide-gray-200">
          <RepoCard
            name={repoName}
            services={repositories[repoName]}
          />
        </li>
      )
    })

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
                {repoCards}
              </ul>
            </div>
          </div>
        </main>
      </div>
    )
  }

}
