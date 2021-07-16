import {Component} from 'react';
import {ACTION_TYPE_ENVS, ACTION_TYPE_USER} from "./redux/redux";

export default class APIBackend extends Component {

  componentDidMount() {
    console.log(this.props.location.pathname);

    if (this.props.location.pathname.startsWith('/login')) {
      return;
    }

    this.props.gimletClient.getUser()
      .then(data => this.props.store.dispatch({type: ACTION_TYPE_USER, payload: data}), () => {/* Generic error handler deals with it */
      });
    this.props.gimletClient.getEnvs()
      .then(data => this.props.store.dispatch({type: ACTION_TYPE_ENVS, payload: data}), () => {/* Generic error handler deals with it */
      });
  }

  render() {
    return null;
  }
}
