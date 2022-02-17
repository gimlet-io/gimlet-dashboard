const AddEnvMenu = ({ addEnvMenuIsOpen, saveButtonTriggered, input }) => {
    if (addEnvMenuIsOpen) {
        return (
            <>
                <input
                    onChange={e => this.setState({ input: e.target.value })}
                    className="shadow appearance-none border rounded w-full my-4 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="environment" type="text" value={input} placeholder="Please enter an environment name" />
                <button
                    disabled={input === "" || saveButtonTriggered}
                    onClick={() => this.save()}
                    className={(input === "" || saveButtonTriggered ? 'bg-green-600 hover:bg-green-500 focus:outline-none focus:border-green-700 focus:shadow-outline-indigo active:bg-green-700' : `bg-gray-600 cursor-default`) + ` inline-flex items-center px-6 py-3 border border-transparent text-base leading-6 font-medium rounded-md text-white transition ease-in-out duration-150`}>
                    Save
                </button>
            </>
        )
    } else {
        return null
    }
}

export default AddEnvMenu;