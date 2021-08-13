import { Fragment, useState } from 'react'
import { Transition } from '@headlessui/react'
import { XIcon } from '@heroicons/react/solid'

export default function DeployStatus() {
  const [show, setShow] = useState(true)

  return (
    <>
      <div
        aria-live="assertive"
        className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start"
      >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          <Transition
            show={show}
            as={Fragment}
            enter="transform ease-out duration-300 transition"
            enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
            enterTo="translate-y-0 opacity-100 sm:translate-x-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="max-w-lg w-full bg-gray-800 text-gray-100 text-sm shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
              <div className="p-4">
                <div className="flex">
                  <div className="w-0 flex-1 justify-between">
                    <p className="text-yellow-100 font-semibold">
                      Rolling out myapp-preview-app
                    </p>
                    <p class="pl-2  ">
                      🎯 staging
                    </p>
                    <p class="pl-2 mb-4">
                      📎 b4f08b
                    </p>
                    <p className="text-yellow-100 font-semibold">
                      Manifests written to git
                    </p>
                    <p className="pl-2 mb-4">
                      📋 861144a
                    </p>
                    <p class="font-semibold text-green-300">
                      Gitops changes applied
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={() => {
                        setShow(false)
                      }}
                    >
                      <span className="sr-only">Close</span>
                      <XIcon className="h-5 w-5" aria-hidden="true" />
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
