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
            allEnvs: reduxState.allEnvs,
            input: '',
            hasRequestError: false,
            saveButtonTriggered: false,
            hasSameEnvNameError: false
        };
        this.props.store.subscribe(() => {
            let reduxState = this.props.store.getState();

            this.setState({
                envs: reduxState.envs,
                envsFromDB: reduxState.envsFromDB,
                allEnvs: reduxState.allEnvs
            });
        });
    }

    getEnvironmentCards() {
        return (
            this.state.allEnvs.map(env => (<EnvironmentCard
                singleEnv={env}
                deleteEnv={() => this.delete(env.name)}
                onlineEnvs={this.state.envs}
            />))
        )
    }

    setTimeOutForSaveButtonTriggered() {
        setTimeout(() => {
            this.setState({
                saveButtonTriggered: false,
                hasRequestError: false,
                hasSameEnvNameError: false
            })
        }, 3000);
    }

    save() {
        this.setState({ saveButtonTriggered: true });
        if (!this.state.allEnvs.some(env => env.name === this.state.input)) {
            this.props.gimletClient.saveEnvToDB(this.state.input)
                .then(() => {
                    this.setState({
                        allEnvs: [...this.state.allEnvs, { name: this.state.input }],
                        input: "",
                        saveButtonTriggered: false
                    });
                }, () => {
                    this.setState({ hasRequestError: true });
                    this.setTimeOutForSaveButtonTriggered();
                })
        } else {
            this.setState({ hasSameEnvNameError: true });
            this.setTimeOutForSaveButtonTriggered();
        }
    }

    delete(envName) {
        this.props.gimletClient.deleteEnvFromDB(envName)
            .then(() => {
                console.log("JÓ MINDEN");
            }, () => {
                console.log("BAJ VAN");
                this.setState({ allEnvs: this.state.allEnvs.filter(env => env.name !== envName) });
            });
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
                                    hasRequestError={this.state.hasRequestError}
                                    hasSameEnvNameError={this.state.hasSameEnvNameError} />}
                            {this.getEnvironmentCards()}
                        </div>
                    </div>
                </main>
            </>
        )
    }
}

export default Environments;
