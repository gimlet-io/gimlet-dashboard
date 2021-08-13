import {Component, Fragment} from 'react'
import {Transition} from '@headlessui/react'
import {XIcon} from '@heroicons/react/solid'

export default class DeployStatus extends Component {
  constructor(props) {
    super(props);

    // default state
    let reduxState = this.props.store.getState();
    this.state = {
      show: true,
      runningDeploys: reduxState.runningDeploys
    }

    // handling API and streaming state changes
    this.props.store.subscribe(() => {
      let reduxState = this.props.store.getState();

      this.setState({runningDeploys: reduxState.runningDeploys});
    });
  }

  render() {
    const {show, runningDeploys} = this.state;
    if (runningDeploys.length === 0) {
      return null;
    }

    const deploy = runningDeploys[0];

    let gitopsWidget = (
      <div>
        <p className="text-yellow-100 font-semibold">
          Manifests written to git
        </p>
        <p className="pl-2 mb-4">
          📋 {deploy.gitopsSha}
        </p>
      </div>
    )

    let appliedWidget = (
      <p className="font-semibold text-green-300">
        Gitops changes applied
      </p>
    )

    if (!deploy.gitopsSha) {
      gitopsWidget = (
        <Loading/>
      )
      appliedWidget = null;
    } else if (!deploy.applied) {
      appliedWidget = (
        <Loading/>
      )
    }

    return (
      <>
        <div
          aria-live="assertive"
          className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start"
        >
          <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
            <Transition
              show={show && runningDeploys.length > 0}
              as={Fragment}
              enter="transform ease-out duration-300 transition"
              enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
              enterTo="translate-y-0 opacity-100 sm:translate-x-0"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div
                className="max-w-lg w-full bg-gray-800 text-gray-100 text-sm shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
                <div className="p-4">
                  <div className="flex">
                    <div className="w-0 flex-1 justify-between">
                      <p className="text-yellow-100 font-semibold">
                        Rolling out {deploy.app}
                      </p>
                      <p class="pl-2  ">
                        🎯 {deploy.env}
                      </p>
                      <p class="pl-2 mb-4">
                        📎 {deploy.sha.slice(0, 6)}
                      </p>
                      {gitopsWidget}
                      {appliedWidget}
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                      <button
                        className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                        onClick={() => {
                          this.setState({show: false});
                        }}
                      >
                        <span className="sr-only">Close</span>
                        <XIcon className="h-5 w-5" aria-hidden="true"/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </>
    )
  }
}

function Loading() {
  return (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
         viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}
