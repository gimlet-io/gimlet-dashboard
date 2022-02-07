import { format, formatDistance } from "date-fns";
import React, { Component } from "react";
import Emoji from "react-emoji-render";
import { nanoid } from 'nanoid'

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
    let { env, app, rolloutHistory, rollback } = this.props;
    const { open } = this.state;
    console.log("ROLLOUTHISTORY.JS ROLLOUTHISTORY STATE BEFORE REVERSE AND SORT");
    console.log(rolloutHistory);

    if (!rolloutHistory) {
      return null;
    }

    rolloutHistory.sort((first, second) => {
      return first.created > second.created
    });

    let previousDateLabel = ''
    const markers = [];
    const rollouts = [];
    let allPreviousCommitsAreRollbacks = true;

    console.log("ROLLOUTHISTORY.JS MARKERS RIGHT AFTER DECLARATION");
    console.log(markers);
    console.log("ROLLOUTHISTORY.JS ROLLOUTS RIGHT AFTER DECLARATION");
    console.log(rollouts);

    rolloutHistory.reverse();
    rolloutHistory.forEach((rollout, idx, ar) => {
      const currentlyReleased = !rollout.rolledBack && allPreviousCommitsAreRollbacks;
      if (currentlyReleased) {
        allPreviousCommitsAreRollbacks = false;
      }

      console.log("ROLLOUTHISTORY.JS ROLLOUTHISTORY STATE AFTER REVERSE AND SORT");
      console.log(rolloutHistory);

      const exactDate = format(rollout.created * 1000, 'h:mm:ss a, MMMM do yyyy')
      const dateLabel = formatDistance(rollout.created * 1000, new Date());

      const showDate = previousDateLabel !== dateLabel
      previousDateLabel = dateLabel;

      let color = rollout.rolledBack ? 'bg-red-300' : 'bg-green-100';
      let ringColor = rollout.rolledBack ? 'ring-red-400' : 'ring-green-200';
      let border = showDate ? 'lg:border-l' : '';

      let title = `[${rollout.version.sha.slice(0, 6)}] ${truncate(rollout.version.message)}

    Deployed by ${rollout.triggeredBy}

    at ${exactDate}`;

      markers.push(
        <div key={rollout.created} class={`h-8 ${border} cursor-pointer`} title={title} onClick={() => this.toggle()}>
          <div className={`h-2 ml-1 md:mx-1 ${color} rounded`}></div>
          {showDate &&
            <div className="hidden lg:block mx-2 mt-2 text-xs text-gray-400">
              <span>{dateLabel} ago</span>
            </div>
          }
        </div>
      )

      rollouts.push(
        <li key={nanoid()}
          className="hover:bg-yellow-100 p-4 rounded"
        >
          <div className="relative pb-4">
            {idx !== ar.length - 1 &&
              <span className="absolute top-8 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
            }
            <div className="relative flex items-start space-x-3">
              <div className="relative">
                <img
                  className={`h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-4 ${ringColor}`}
                  src={`https://github.com/${rollout.triggeredBy}.png?size=128`}
                  alt={rollout.triggeredBy} />
              </div>
              <div className="min-w-0 flex-1">
                <div>
                  <div className="text-sm">
                    <p href="#" className="font-medium text-gray-900">{rollout.triggeredBy}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    <span>Released</span>
                    <a
                      className="ml-1"
                      title={exactDate}
                      href={`https://github.com/${rollout.gitopsRepo}/commit/${rollout.gitopsRef}`}
                      target="_blank"
                      rel="noopener noreferrer">
                      {dateLabel} ago
                    </a>
                  </p>
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  <div className="ml-2 md:ml-4">
                    <Commit version={rollout.version} />
                  </div>
                </div>
              </div>
              <div>
                {!currentlyReleased && !rollout.rolledBack &&
                  <button
                    type="button"
                    onClick={(e) => {
                      // eslint-disable-next-line no-restricted-globals
                      confirm('Are you sure you want to roll back?') &&
                        rollback(env, app, rollout.gitopsRef, e);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Rollback to this version
                  </button>
                }
                {rollout.rolledBack &&
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Rolled back
                  </span>
                }
                {currentlyReleased &&
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Current version
                  </span>
                }
              </div>
            </div>
          </div>
        </li>
      )
    })

    markers.reverse();

    console.log("ROLLOUTHISTORY.JS MARKERS AFTER REVERSE");
    console.log(markers);
    console.log("ROLLOUTHISTORY.JS ROLLOUTHISTORY AFTER PROCESSES");
    console.log(rolloutHistory);

    return (
      <div className="">
        <div className="grid grid-cols-10 p-2">
          {markers}
        </div>
        {open &&
          <div className="bg-yellow-50 rounded">
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
  const { version } = props;

  const exactDate = format(version.created * 1000, 'h:mm:ss a, MMMM do yyyy')
  const dateLabel = formatDistance(version.created * 1000, new Date());

  return (
    <div className="md:flex text-xs text-gray-500">
      <div className="md:flex-initial">
        <span className="font-semibold leading-none">{version.message && <Emoji text={version.message} />}</span>
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
              className="ml-1"
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
