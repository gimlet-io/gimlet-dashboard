import React, {Component} from 'react';
import './services.css';
import * as PropTypes from "prop-types";

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

    return (
      <div>
        {Object.keys(envs).map((envName) => {
          const env = envs[envName];
          const renderedServices = env.stacks.map((service) => {
            return (
              <li key={service.name} className="col-span-1 bg-white rounded-lg shadow divide-y divide-gray-200">
                <Service
                  env={env.name}
                  service={service}
                />
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
    );
  }
}

function Service(props)
{
  const {env, service} = props;

  return (
    <div className="w-full flex items-center justify-between p-6 space-x-6">
      <div className="flex-1 truncate">
        <div className="flex items-center space-x-3">
          <h3 className="text-gray-900 text-sm font-bold truncate">{service.repo}</h3>
        </div>
        <Deployment
          env={env}
          deployment={service.deployment}
        />
      </div>
    </div>
  )
}

function Deployment(props)
{
  const {env, deployment} = props;

  return <div>
    <p className="text-xs">{deployment.namespace}/{deployment.name}
      <span
        className="flex-shrink-0 inline-block px-2 py-0.5 mx-1 text-green-800 text-xs font-medium bg-green-100 rounded-full">
        {env}
      </span>
    </p>
    <p className="mb-1">
      <p className="break-words">{deployment.message}</p>
      <p className="text-xs italic">
        <a
          href="https://github.com" target="_blank"
          rel="noopener noreferrer">
          {deployment.sha.slice(0, 6)}
        </a>
      </p>
    </p>
    {deployment.pods.map((pod) => (
      <Pod pod={pod}/>
    ))
    }
  </div>;
}

Deployment.propTypes =
{
  deployment: PropTypes.any,
}
;

function Pod(props)
{
  const {pod} = props;

  let color;
  let pulsar;
  switch (pod.status) {
    case 'Running':
      color = 'text-blue-200';
      pulsar = '';
      break;
    case 'PodInitializing':
    case 'ContainerCreating':
    case 'Pending':
      color = 'text-blue-100';
      pulsar = 'pulsar-green';
      break;
    case 'Terminating':
      color = 'text-blue-800';
      pulsar = 'pulsar-gray';
      break;
    default:
      color = 'text-red-600';
      pulsar = '';
      break;
  }

  return (
    <span className="inline-block w-4 mr-1 mt-2">
      <svg viewBox="0 0 1 1"
           className={`fill-current ${color} ${pulsar}`}>
        <g>
          <title>{pod.name} - {pod.status}</title>
          <rect width="1" height="1"/>
        </g>
      </svg>
    </span>
  );
}
