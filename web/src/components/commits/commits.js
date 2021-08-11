import {format, formatDistance} from "date-fns";
import React, {Component} from "react";
import DeployWidget from "../deployWidget/deployWidget";

export class Commits extends Component {
  render() {
    const {commits} = this.props;

    if (!commits) {
      return null;
    }

    const commitWidgets = [];

    commits.forEach((commit, idx, ar) => {
      const exactDate = format(commit.created_at * 1000, 'h:mm:ss a, MMMM do yyyy')
      const dateLabel = formatDistance(commit.created_at * 1000, new Date());
      let ringColor = 'ring-gray-100';

      commitWidgets.push(
        <li key={idx}>
          <div className="relative pl-2 py-4 hover:bg-gray-100 rounded">
            {idx !== ar.length - 1 &&
            <span className="absolute top-4 left-6 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
            }
            <div className="relative flex items-start space-x-3">
              <div className="relative">
                <img
                  className={`h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-4 ${ringColor}`}
                  src={`${commit.author_pic}&s=60`}
                  alt={commit.author}/>
              </div>
              <div className="min-w-0 flex-1">
                <div>
                  <div className="text-sm">
                    <p href="#" className="font-semibold text-gray-800">{commit.message}
                      <span>
                      {commit.status && commit.status.statuses &&
                      commit.status.statuses.map(status => <StatusIcon status={status}/>)
                      }
                    </span>
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-800">
                    <a
                      className="font-semibold"
                      href={`https://github.com/${commit.author}`}
                      target="_blank"
                      rel="noopener noreferrer">
                      {commit.authorName}
                    </a>
                    <span class="ml-1">committed</span>
                    <a
                      class="ml-1"
                      title={exactDate}
                      href={commit.url}
                      target="_blank"
                      rel="noopener noreferrer">
                      {dateLabel} ago
                    </a>
                  </p>
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  <div class="ml-2 md:ml-4">

                  </div>
                </div>
              </div>
              <div class="pr-4">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-gray-100 text-gray-800 mr-2">
                  was recently on Staging
                </span>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-pink-100 text-pink-800 mr-2"
                >
                  on Production
                </span>
                <DeployWidget />
              </div>
            </div>
          </div>
        </li>
      )
    })

    return (
      <div className="flow-root">
        <ul className="-mb-4">
          {commitWidgets}
        </ul>
      </div>
    )
  }
}

class StatusIcon extends Component {
  render() {
    const {status} = this.props;

    switch (status.state) {
      case 'SUCCESS':
        return (
          <svg class="inline fill-current text-green-400 ml-1" viewBox="0 0 12 16" version="1.1" width="15" height="20"
               role="img"
          >
            <title>{status.context}</title>
            <path fill-rule="evenodd" d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5L12 5z"/>
          </svg>
        );
      case 'PENDING':
        return (
          <svg class="inline fill-current text-yellow-400 ml-1" viewBox="0 0 8 16" version="1.1" width="10" height="20"
               role="img"
          >
            <title>{status.context}</title>
            <path fill-rule="evenodd" d="M0 8c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z"/>
          </svg>
        );
      default:
        return (
          <svg className="inline fill-current text-red-400 ml-1" viewBox="0 0 12 16" version="1.1" width="15"
               height="20"
               role="img"
          >
            <title>{status.context}</title>
            <path fill-rule="evenodd"
                  d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z"/>
          </svg>
        )
    }
  }
}
