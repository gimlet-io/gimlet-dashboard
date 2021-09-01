import {Component} from 'react';
import {
  ACTION_TYPE_AGENTS,
  ACTION_TYPE_ENVS,
  ACTION_TYPE_GIMLETD,
  ACTION_TYPE_GITOPS_REPO,
  ACTION_TYPE_USER
} from "./redux/redux";

export default class APIBackend extends Component {

  componentDidMount() {
    console.log(this.props.location.pathname);

    if (this.props.location.pathname.startsWith('/login')) {
      return;
    }

    this.props.gimletClient.getGitopsRepo()
      .then(data => this.props.store.dispatch({type: ACTION_TYPE_GITOPS_REPO, payload: data}), () => {/* Generic error handler deals with it */
      });
    this.props.gimletClient.getAgents()
      .then(data => this.props.store.dispatch({type: ACTION_TYPE_AGENTS, payload: data}), () => {/* Generic error handler deals with it */
      });
    this.props.gimletClient.getUser()
      .then(data => this.props.store.dispatch({type: ACTION_TYPE_USER, payload: data}), () => {/* Generic error handler deals with it */
      });
    this.props.gimletClient.getEnvs()
      .then(data => this.props.store.dispatch({type: ACTION_TYPE_ENVS, payload: data}), () => {/* Generic error handler deals with it */
      });
    this.props.gimletClient.getGimletD()
      .then(data => this.props.store.dispatch({type: ACTION_TYPE_GIMLETD, payload: data}), () => {/* Generic error handler deals with it */
      });
  }

  render() {
    return null;
  }
}
