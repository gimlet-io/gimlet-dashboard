import React, {Component} from 'react';
import ServiceList from "../../components/serviceList/serviceList";

export default class Services extends Component {
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

    let services = Object.keys(envs).map((envName) => {
      const env = envs[envName];
      return env.stacks;
    });
    services = services.flat();
    services = services.sort((firstEl, secondEl) => {
      return firstEl.repo > secondEl.repo;
    })

    console.log(services)

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
                <ServiceList
                  services={services}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }
}