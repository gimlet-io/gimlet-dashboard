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
            />))
        )
    }

    save() {
        this.props.gimletClient.saveEnvToDB(this.state.input)
    }

    delete() {
        this.props.gimletClient.deleteEnvFromDB(this.state.input)
    }

    render() {
        console.log(this.state.envs)
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
                        <input
                        onChange={e => this.setState({ input: e.target.value})}
                        class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="environment" type="text" placeholder=""/>
                       {this.state.input !== '' && <button
                        onClick={() => this.save()}
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Save button</button>}
                         <button
                        onClick={() => this.delete()}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Delete button</button>
                    </div>
                </header>
                <main>
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="px-4 py-8 sm:px-0">
                            {this.getEnvironmentCards()}
                        </div>
                    </div>
                </main>
            </>
        )
    }
}

export default Environments;
