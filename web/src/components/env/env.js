import React, {Component} from "react";
import ServiceDetail from "../serviceDetail/serviceDetail";

export class Env extends Component {

    constructor(props) {
        super(props);
        this.state = {
            isClosed: false
        }
    }
    
    render() {
        const {searchFilter, owner, repo, envName, env, repoRolloutHistory} = this.props;

        const emptyState = searchFilter !== '' ?
            emptyStateSearch() 
            : 
            emptyStateDeployThisRepo(owner, repo, envName, this.props.history);

      const renderedServices = env.stacks.map((service) => {
        let appRolloutHistory = undefined;
        if (repoRolloutHistory) {
          appRolloutHistory = repoRolloutHistory[envName][service.service.name]
        }

        return (
          <ServiceDetail
            key={service.service.name}
            service={service}
            rolloutHistory={appRolloutHistory}
            rollback={this.rollback}
            owner={owner}
            repo={repo}
            envName={envName}
            history={this.props.history}
          />
        )
      })

        return (
            <div>
              <h4 className="flex items-stretch select-none text-xl font-medium capitalize leading-tight text-gray-900 my-4">
                  {envName}
                  <svg
                    onClick={() => {
                        this.setState((prevState) => {
                            return {
                            isClosed: !prevState.isClosed
                            }
                        })
                    }}

                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 cursor-pointer"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        this.state.isClosed
                          ? "M9 5l7 7-7 7"
                          : "M19 9l-7 7-7-7"
                      }
                    />
                  </svg>
                </h4>
               {this.state.isClosed ? null : (
                  <div class="bg-white shadow divide-y divide-gray-200 p-4 sm:p-6 lg:p-8">
                    {renderedServices.length > 0
                      ? renderedServices
                      : emptyState}
                  </div>
                )}
            </div>
          )
    }
}

function emptyStateSearch() {
    return <p className="text-xs text-gray-800">No service matches the search</p>
}

function emptyStateDeployThisRepo(owner, repo, env, history) {
    return <div
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        history.push(`/repo/${owner}/${repo}/envs/${env}`);
      }}
      className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      <div className="mt-2 block text-sm font-bold text-gray-500">
        Deploy this repository to <span className="capitalize">{env}</span>
      </div>
    </div>
  }
