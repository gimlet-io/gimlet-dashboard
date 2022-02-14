import { Component } from 'react';
import EnvironmentCard from './EnvironmentCard';

class Environments extends Component {
    constructor(props) {
        super(props);
        let reduxState = this.props.store.getState();

        this.state = {
            envs: reduxState.envs,
        };
        this.props.store.subscribe(() => {
            let reduxState = this.props.store.getState();

            this.setState({
                envs: reduxState.envs
            });
        });
    }


    render() {
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
                        <EnvironmentCard envs={this.state.envs} />
                    </div>
                </main>
            </>
        )
    }
}

export default Environments;
