const EnvironmentCard = ({ isOnline, singleEnv, deleteEnv }) => {
    return (
        <div className='bg-white overflow-hidden shadow rounded-lg my-4 w-full px-4 py-5 sm:px-6 focus:outline-none'>
            <div className='flex justify-between'>
                <div className="inline-flex">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 pr-1">
                        {singleEnv.name}
                    </h3>
                    {isOnline ?
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg> :
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                        </svg>}
                </div>
                {!isOnline &&
                    <div className="inline-flex">
                        <a className="cursor-pointer text-gray-500 hover:text-gray-700 mr-4"
                            target="_blank"
                            rel="noreferrer"
                            href="https://gimlet.io/docs/installing-gimlet-agent">
                            Install agent...
                        </a>
                        <svg xmlns="http://www.w3.org/2000/svg" onClick={deleteEnv} className="cursor-pointer inline text-red-400 hover:text-red-600 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                }
            </div>
        </div>
    )
};

export default EnvironmentCard;
