const PopUpWindow = ({ savedSuccess, isError, errorMessage }) => {

    const loadText = () => {
        if (!savedSuccess && !isError) {
            return (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path className="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                </>)
        }
        return (savedSuccess ? "Config saved succesfully!" : `Something went wrong: ${errorMessage}.`)

    }

    return (
        <div
            className="fixed inset-0 flex px-4 py-6 pointer-events-none sm:p-6 w-full flex-col items-end space-y-4"
        >
            <div
                className="max-w-lg w-full bg-gray-800 text-gray-100 text-sm shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
                <div className="flex p-4">
                    {loadText()}
                </div>
            </div>
        </div>
    );
};

export default PopUpWindow;