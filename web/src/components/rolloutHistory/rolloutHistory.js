import {format, formatDistance} from "date-fns";
import React, {Component} from "react";

export class RolloutHistory extends Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false
    }

    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    this.setState(prevState => ({
      open: !prevState.open
    }));
  }

  render() {
    let {rolloutHistory} = this.props;
    const {open} = this.state;

    console.log(rolloutHistory)

    if (!rolloutHistory) {
      return null;
    }

    rolloutHistory.sort((first, second) => {
      return first.created > second.created
    });

    let previousDateLabel = ''
    const markers = [];
    const rollouts = [];

    rolloutHistory.forEach((rollout, idx, ar) => {
      const exactDate = format(rollout.created * 1000, 'h:mm:ss a, MMMM do yyyy')
      const dateLabel = formatDistance(rollout.created * 1000, new Date());

      const showDate = previousDateLabel !== dateLabel
      previousDateLabel = dateLabel;

      let color = rollout.rolledBack ? 'bg-red-100' : 'bg-green-100';
      let ringColor = rollout.rolledBack ? 'ring-red-100' : 'ring-green-100';
      let border = showDate ? 'lg:border-l' : '';

      let title = `[${rollout.version.sha.slice(0, 6)}] ${truncate(rollout.version.message)}

Deployed by ${rollout.triggeredBy}

at ${exactDate}`;

      markers.push(
        <div class={`h-8 ${border} cursor-pointer`} title={title} onClick={() => this.toggle()}>
          <div className={`h-2 ml-1 md:mx-1 ${color} rounded`}></div>
          {showDate &&
          <div class="hidden lg:block mx-2 mt-2 text-xs text-gray-400">
            <span>{dateLabel} ago</span>
          </div>
          }
        </div>
      )

      rollouts.push(
        <li>
          <div className="relative pb-4">
            {idx !== 0 &&
            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
            }
            <div className="relative flex items-start space-x-3">
              <div className="relative">
                <img
                  className={`h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-4 ${ringColor}`}
                  src={`https://github.com/${rollout.triggeredBy}.png?size=128`}
                  alt={rollout.triggeredBy}/>
              </div>
              <div className="min-w-0 flex-1">
                <div>
                  <div className="text-sm">
                    <p href="#" className="font-medium text-gray-900">{rollout.triggeredBy}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Released {dateLabel} ago
                  </p>
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  <div class="ml-2 md:ml-4">
                    <Commit version={rollout.version}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </li>
      )

    })

    rollouts.reverse();

    return (
      <div className="">
        <div class="grid grid-cols-10 p-2">
          {markers}
        </div>
        {open &&
        <div class="bg-yellow-50 rounded">
          <div className="flow-root">
            <ul className="-mb-4 p-2 md:p-4 lg:p-8">
              {rollouts}
            </ul>
          </div>
        </div>
        }
      </div>
    )
  }
}

function Commit(props) {
  const {version} = props;

  const exactDate = format(version.created * 1000, 'h:mm:ss a, MMMM do yyyy')
  const dateLabel = formatDistance(version.created * 1000, new Date());

  return (
    <div className="md:flex text-xs text-gray-500">
      <div className="md:flex-initial">
        <span className="font-semibold leading-none">{version.message}</span>
        <div className="flex mt-1">
          {version.author &&
          <img
            className="rounded-sm overflow-hidden mr-1"
            src={`https://github.com/${version.author}.png?size=128`}
            alt={version.authorName}
            width="20"
            height="20"
          />
          }
          <div>
            <span className="font-semibold">{version.authorName}</span>
            <a
              class="ml-1"
              title={exactDate}
              href={`https://github.com/${version.repositoryName}/commit/${version.sha}`}
              target="_blank"
              rel="noopener noreferrer">
              comitted {dateLabel} ago
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function truncate(input) {
  if (input.length > 30) {
    return input.substring(0, 30) + '...';
  }
  return input;
}
