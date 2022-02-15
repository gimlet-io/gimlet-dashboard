import { Component } from 'react';
import EnvironmentCard from './EnvironmentCard';

class Environments extends Component {
    constructor(props) {
        super(props);
        let reduxState = this.props.store.getState();

        this.state = {
            envs: reduxState.envs,
            envsFromDB: reduxState.envsFromDB,
            input: ''
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
        return (
            Object.keys(this.state.envsFromDB).map(env => (<EnvironmentCard singleEnv={this.state.envsFromDB[env]}
                isOnline={this.state.envsFromDB[env].name === "staging"}
                deleteEnv={this.delete}
            />))
        )
    }

    save() {
        this.props.gimletClient.saveEnvToDB(this.state.input);
        this.setState({ envsFromDB: [...this.state.envsFromDB, { name: this.state.input }] });
        this.setState({ input: "" });
    }

    delete() {
        this.props.gimletClient.deleteEnvFromDB(this.state.input);
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
                                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="environment" type="text" value={this.state.input} placeholder="Please enter an environment name..." />
                            <button
                                onClick={() => this.save()}
                                className={(this.state.input === '' ? 'cursor-not-allowed bg-gray-500 hover:bg-gray-700 ' : 'bg-green-500 hover:bg-green-700 ') + `text-white font-bold my-2 py-2 px-4 rounded`}>
                                Save environment
                            </button>
                            {this.getEnvironmentCards()}
                        </div>
                    </div>
                </main>
            </>
        )
    }
}

export default Environments;
