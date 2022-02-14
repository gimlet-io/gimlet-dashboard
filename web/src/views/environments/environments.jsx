import { Component } from 'react';

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
                        <div className="px-4 py-8 sm:px-0">
                            {Object.keys(this.state.envs).map(env => (
                                <div className='bg-white overflow-hidden shadow rounded-lg my-4 w-fullpx-4 py-5 sm:px-6 focus:outline-none'>
                                    <div className='inline-grid'>
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                            {this.state.envs[env].name}
                                        </h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </>
        )
    }
}

export default Environments;
