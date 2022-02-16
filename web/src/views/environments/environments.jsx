import { Component } from 'react';
import EnvironmentCard from './EnvironmentCard';
import EnvironmentsPopUpWindow from './EnvironmentsPopUpWindow';

class Environments extends Component {
    constructor(props) {
        super(props);
        let reduxState = this.props.store.getState();

        this.state = {
            envs: reduxState.envs,
            envsFromDB: reduxState.envsFromDB,
            input: '',
            hasRequestError: false,
            saveButtonTriggered: false
        };
        this.props.store.subscribe(() => {
            let reduxState = this.props.store.getState();

            this.setState({
                envs: reduxState.envs,
                envsFromDB: reduxState.envsFromDB
            });
        });
    }

    getEnvironmentCards() {
        const onlineEnvs = Object.keys(this.state.envs).map(env => this.state.envs[env]);
        const offlineEnvs = this.state.envsFromDB;
        const allEnvs = this.mergeObjectArraysByKey(onlineEnvs, offlineEnvs, "name")
        return (
            allEnvs.map(env => (<EnvironmentCard
                singleEnv={env}
                deleteEnv={() => this.delete(env.name)}
                onlineEnvs={onlineEnvs}
            />))
        )
    }

    mergeObjectArraysByKey = (arrayOne, arrayTwo, key) =>
        arrayOne.filter(arrayOneElem =>
            !arrayTwo.find(arrayTwoElem =>
                arrayOneElem[key] === arrayTwoElem[key])).concat(arrayTwo);

    setTimeOutForSaveButtonTriggered() {
        setTimeout(() => { this.setState({ saveButtonTriggered: false, hasRequestError: false }) }, 3000);
    }

    save() {
        this.setState({ saveButtonTriggered: true });
        this.props.gimletClient.saveEnvToDB(this.state.input)
            .then(data => {
                this.setState({ envsFromDB: [...this.state.envsFromDB, { name: this.state.input }], input: "" });
                this.setTimeOutForSaveButtonTriggered();
            }, err => {
                this.setState({ hasRequestError: true });
                this.setTimeOutForSaveButtonTriggered();
            })
    }

    delete(envName) {
        this.props.gimletClient.deleteEnvFromDB(envName);
    }

    render() {
        if (!this.state.envsFromDB) {
            return null;
        }

        if (!this.state.envs) {
            return null;
        }

        return (
            <>
                <header>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="text-3xl font-bold leading-tight text-gray-900">Environments</h1>
                    </div>
                </header>
                <main>
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="px-4 py-8 sm:px-0">
                            <input
                                onChange={e => this.setState({ input: e.target.value })}
                                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="environment" type="text" value={this.state.input} placeholder="Please enter an environment name" />
                            <button
                                disabled={this.state.input === "" || this.state.saveButtonTriggered}
                                onClick={() => this.save()}
                                className={(this.state.input === "" || this.state.saveButtonTriggered ? 'cursor-not-allowed bg-gray-500 hover:bg-gray-700 ' : 'bg-green-500 hover:bg-green-700 ') + `text-white font-bold my-2 py-2 px-4 rounded`}>
                                Save environment
                            </button>
                            {this.state.saveButtonTriggered &&
                                <EnvironmentsPopUpWindow
                                    hasRequestError={this.state.hasRequestError} />}
                            {this.getEnvironmentCards()}
                        </div>
                    </div>
                </main>
            </>
        )
    }
}

export default Environments;
