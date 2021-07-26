import React, {Component} from 'react';
import ServiceCard from "../../components/serviceCard/serviceCard";

export default class Services extends Component {
  constructor(props) {
    super(props);

    // default state
    let reduxState = this.props.store.getState();
    this.state = {
      envs: reduxState.envs,
      search: reduxState.search
    }

    // handling API and streaming state changes
    this.props.store.subscribe(() => {
      let reduxState = this.props.store.getState();

      this.setState({envs: reduxState.envs});
      this.setState({search: reduxState.search});
    });

    this.navigateToRepo = this.navigateToRepo.bind(this);
  }

  navigateToRepo(repo) {
    if (repo.startsWith('github.com/')) { //TODO remove github.com from input data
      repo = repo.replace('github.com/', '');
    }

    this.props.history.push(`/repo/${repo}`)
  }

  render() {
    let {envs, search} = this.state;

    let filteredEnvs = {};
    for (const envName of Object.keys(envs)) {
      const env = envs[envName];
      filteredEnvs[env.name] = {name: env.name, stacks: env.stacks};
      if (search.filter !== '') {
        filteredEnvs[env.name].stacks = env.stacks.filter((service) => {
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

    return (
      <div>
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">Services</h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <div>
                {Object.keys(filteredEnvs).map((envName) => {
                  const env = filteredEnvs[envName];
                  const renderedServices = env.stacks.map((service) => {
                    return (
                      <li key={service.name} className="col-span-1 bg-white rounded-lg shadow divide-y divide-gray-200">
                        <ServiceCard
                          service={service}
                          navigateToRepo={this.navigateToRepo}
                        />
                      </li>
                    )
                  })

                  return (
                    <div>
                      <h4 className="text-xl font-medium capitalize leading-tight text-gray-900 my-4">{envName}</h4>

                      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {renderedServices.length > 0 ? renderedServices : emptyState}
                      </ul>
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