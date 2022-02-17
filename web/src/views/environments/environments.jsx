import { Component } from 'react';
import EnvironmentCard from './environmentCard.jsx';
import EnvironmentsPopUpWindow from './environmentsPopUpWindow.jsx';
import {
    ACTION_TYPE_GETALLENVS
} from "../../redux/redux";

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

    componentDidMount() {
        this.props.gimletClient.getAllEnvs()
            .then(data => {
                this.props.store.dispatch({
                    type: ACTION_TYPE_GETALLENVS,
                    payload: data
                });
            }, () => {/* Generic error handler deals with it */
            });
    }

    getEnvironmentCards() {
        return (
            this.state.allEnvs.map(env => (<EnvironmentCard
                singleEnv={env}
                deleteEnv={() => this.delete(env.name)}
                isOnline={this.isOnline(this.state.envs, env)}
            />))
        )
    }

    isOnline(onlineEnvs, singleEnv) {
        return Object.keys(onlineEnvs)
            .map(env => onlineEnvs[env])
            .some(onlineEnv => {
                return onlineEnv.name === singleEnv.name
            })
    };

    setTimeOutForButtonTriggered() {
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
                    this.setTimeOutForButtonTriggered();
                })
        } else {
            this.setState({ hasSameEnvNameError: true });
            this.setTimeOutForButtonTriggered();
        }
    }

    delete(envName) {
        this.props.gimletClient.deleteEnvFromDB(envName)
            .then(() => {
                this.setState({ allEnvs: this.state.allEnvs.filter(env => env.name !== envName) });
            }, () => {
                this.setState({ hasRequestError: true });
                this.setTimeOutForButtonTriggered();
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
                                className={(this.state.input === "" || this.state.saveButtonTriggered ? 'bg-green-600 hover:bg-green-500 focus:outline-none focus:border-green-700 focus:shadow-outline-indigo active:bg-green-700' : `bg-gray-600 cursor-default`) + ` inline-flex items-center px-6 py-3 border border-transparent text-base leading-6 font-medium rounded-md text-white transition ease-in-out duration-150`}>
                                Save environment
                            </button>
                            {(this.state.hasRequestError || this.state.hasSameEnvNameError) &&
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
