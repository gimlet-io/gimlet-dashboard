const EnvironmentCard = ({ envs }) => {
    return (
        <div className="px-4 py-8 sm:px-0">
            {Object.keys(envs).map(env => (
                <div className='bg-white overflow-hidden shadow rounded-lg my-4 w-fullpx-4 py-5 sm:px-6 focus:outline-none'>
                    <div className='inline-grid'>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            {envs[env].name}
                        </h3>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default EnvironmentCard;
