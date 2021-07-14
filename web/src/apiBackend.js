import {Component} from 'react';
import {ACTION_TYPE_ENVS} from "./redux/redux";

export default class APIBackend extends Component {

  componentDidMount() {
    if (this.props.location.pathname === '/login') {
      return;
    }

    this.props.gimletClient.getEnvs()
      .then(data => this.props.store.dispatch({type: ACTION_TYPE_ENVS, payload: data}), () => {/* Generic error handler deals with it */
      });
  }

  render() {
    return null;
  }
}
