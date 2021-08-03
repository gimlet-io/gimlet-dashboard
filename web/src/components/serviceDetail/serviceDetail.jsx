import React, {Component} from 'react';
import {Pod} from "../serviceCard/serviceCard";
import {format, formatDistance} from 'date-fns';

function ServiceDetail(props) {
  const {service, rolloutHistory} = props;

  return (
    <div class="w-full flex items-center justify-between p-6 space-x-6">
      <div class="flex-1 truncate">
        <h3 class="text-lg font-bold mb-2">{service.service.name}</h3>
        <div class="my-2 mb-4 sm:my-4 sm:mb-6">
          <RolloutHistory rolloutHistory={rolloutHistory}/>
        </div>
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

function RolloutHistory(props) {
  let {rolloutHistory} = props;

  console.log(rolloutHistory)


  if (!rolloutHistory) {
    return null;
  }

  rolloutHistory.sort((first, second) => {
    return first.created > second.created
  });

  let previousDateLabel = ''
  const markers = rolloutHistory.map((rollout) => {

    const exactDate = format(rollout.created * 1000, 'MMMM do yyyy, h:mm:ss a')
    const dateLabel = formatDistance(rollout.created * 1000, new Date());

    const showDate = previousDateLabel !== dateLabel
    previousDateLabel = dateLabel;

    let color = rollout.rolledBack ? 'bg-red-100' : 'bg-green-100';
    let border = showDate ? 'border-l' : '';

    return (
      <div className={`h-8 ${border}`}>
        <div className={`h-1 sm:h-2 mx-2 ${color} rounded`}></div>
        {showDate &&
        <div className="mx-2 mt-2 text-xs text-gray-400">
          <span title={exactDate}>{dateLabel} ago</span>
        </div>
        }
      </div>
    )
  })

  return (
    <div class="grid grid-cols-10">
      {markers}
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
