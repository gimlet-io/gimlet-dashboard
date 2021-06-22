import {Component} from "react";
import {ACTION_TYPE_STREAMING} from "./redux/redux"

let URL = '';
if (typeof window !== 'undefined') {
  let port = window.location.port;
  if (window.location.hostname === 'localhost') {
    port = "9000";
  }
  let protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  URL = protocol + '://' + window.location.hostname + ':' + port;
}

export default class StreamingBackend extends Component {
  componentDidMount() {
    this.ws = new WebSocket(URL + '/ws/');
    this.ws.onopen = this.onOpen;
    this.ws.onmessage = this.onMessage;
    this.ws.onclose = this.onClose;

    this.onClose = this.onClose.bind(this);
  }

  render() {
    return null;
  }

  onOpen = () => {
    console.log('connected');
  };

  onClose = (evt) => {
    console.log('disconnected: ' + evt.code + ': ' + evt.reason);
    const ws = new WebSocket(URL + '/ws/');
    ws.onopen = this.onOpen;
    ws.onmessage = this.onMessage;
    ws.onclose = this.onClose;
    this.setState({
      ws
    });
  }

  onMessage = (evt) => {
    evt.data.split('\n').forEach((line) => {
      const message = JSON.parse(line);
      console.log(message);
      this.props.store.dispatch({type: ACTION_TYPE_STREAMING, payload: message});
    });
  }
}
