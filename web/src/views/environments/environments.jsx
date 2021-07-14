import React, {Component} from 'react';
import ServiceCard from "../../components/serviceCard/serviceCard";

export default class Environments extends Component {
  constructor(props) {
    super(props);

    // default state
    let reduxState = this.props.store.getState();
    this.state = {
      envs: reduxState.envs
    }

    // handling API and streaming state changes
    this.props.store.subscribe(() => {
      let reduxState = this.props.store.getState();

      this.setState({envs: reduxState.envs});
    });
  }

  render() {
    const {envs} = this.state;

    return (
      <div>
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">Environments</h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <div>
                {Object.keys(envs).map((envName) => {
                  const env = envs[envName];
                  const renderedServices = env.stacks.map((service) => {
                    return (
                      <li key={service.name} className="col-span-1 bg-white rounded-lg shadow divide-y divide-gray-200">
                        <ServiceCard service={service}/>
                      </li>
                    )
                  })

                  return (
                    <div>
                      <h4 className="text-xl font-medium capitalize leading-tight text-gray-900 my-4">{envName}</h4>

                      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {renderedServices}
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