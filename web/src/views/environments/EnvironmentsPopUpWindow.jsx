const EnvironmentsPopUpWindow = ({ hasRequestError }) => {
    if (hasRequestError) {
        return (
            <div
                className="fixed inset-0 flex px-4 py-6 pointer-events-none sm:p-6 w-full flex-col items-end space-y-4">
                <div
                    className="max-w-lg w-full bg-red-600 text-gray-100 text-sm shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
                    <div className="flex p-4">An error has occurred during saving</div>
                </div>
            </div >
        )
    } else {
        return null
    }
}

export default EnvironmentsPopUpWindow;