import {format, formatDistance} from "date-fns";
import React, {Component} from "react";

export class Commits extends Component {
  render() {
    let {commits} = this.props;

    console.log(commits)

    if (!commits) {
      return null;
    }

    const commitWidgets = [];

    commits.forEach((commit, idx, ar) => {
      const exactDate = format(commit.created_at * 1000, 'h:mm:ss a, MMMM do yyyy')
      const dateLabel = formatDistance(commit.created_at * 1000, new Date());
      let ringColor = 'ring-gray-100';

      commitWidgets.push(
        <li>
          <div className="relative pb-4">
            {idx !== ar.length - 1 &&
            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
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
                    <p href="#" className="font-semibold text-gray-800">{commit.message}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-800">
                    <a
                      className="font-semibold"
                      href={`https://github.com/${commit.author}`}
                      target="_blank"
                      rel="noopener noreferrer">
                      {commit.author}
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
