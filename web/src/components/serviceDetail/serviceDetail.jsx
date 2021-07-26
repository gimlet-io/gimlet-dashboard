import React, {Component} from 'react';
import {Pod} from '../serviceCard/serviceCard'

function ServiceDetail(props) {
  const {service} = props;

  return (
    <div class="w-full flex items-center justify-between p-6 space-x-6">
      <div class="flex-1 truncate">
        <p class="text-sm font-bold">{service.service.namespace}/{service.service.name}</p>
        <div class="flex flex-wrap text-sm">
          <div class="flex-1 min-w-full md:min-w-0">
            {service.ingresses ? service.ingresses.map((ingress) => <Ingress ingress={ingress}/>) : null}
          </div>
          <div class="flex-1 md:ml-2 min-w-full md:min-w-0">
            <Deployment
              envName={service.env}
              repo={service.repo}
              deployment={service.deployment}
            />
          </div>
          <div class="flex-1 min-w-full md:min-w-0"/>
        </div>
      </div>
    </div>
  )
}

class Ingress extends Component {
  render() {
    const {ingress} = this.props;

    if (ingress === undefined) {
      return null;
    }

    return (
      <div class="bg-gray-100 p-2 mb-1 border rounded-sm border-gray-200 text-gray-500 relative">
        <span class="text-xs text-gray-400 absolute bottom-0 right-0 p-2">ingress</span>
        <div class="mb-1"><a href={'https://' + ingress.url} target="_blank" rel="noopener noreferrer">{ingress.url}</a>
        </div>
        <p class="text-xs">{ingress.namespace}/{ingress.name}</p>
      </div>
    );
  }
}

class Deployment extends Component {
  render() {
    const {deployment, repo} = this.props;

    if (deployment === undefined) {
      return null;
    }

    return (
      <div class="bg-gray-100 p-2 mb-1 border rounded-sm border-blue-200, text-gray-500 relative">
        <span class="text-xs text-gray-400 absolute bottom-0 right-0 p-2">deployment</span>
        <p class="mb-1">
          <p class="break-words">{deployment.message}</p>
          <p class="text-xs italic"><a href={`https://github.com/${repo}/commit/${deployment.sha}`} target="_blank"
                                       rel="noopener noreferrer">{deployment.sha.slice(0, 6)}</a></p>
        </p>
        <p class="text-xs">{deployment.namespace}/{deployment.name}</p>
        {
          deployment.pods && deployment.pods.map((pod) => (
            <Pod pod={pod}/>
          ))
        }
      </div>
    );
  }

}

export default ServiceDetail;
