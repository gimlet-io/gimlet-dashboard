import * as eventHandlers from './eventHandlers';

const ACTION_TYPE_STREAMING = 'streaming';

export const EVENT_AGENT_CONNECTED = 'agentConnected';
export const EVENT_AGENT_DISCONNECTED = 'agentDisconnected';
export const EVENT_ENVS_UPDATED = 'envsUpdated';

export const initialState = {
  settings: {
    agents: []
  },
  envs: {
    loaded: false,
  }
};

export function rootReducer(state = initialState, action) {
  switch (action.type) {
    case ACTION_TYPE_STREAMING:
      return processStreamingEvent(state, action.payload)
    default:
      return state;
  }
}

function processStreamingEvent(state, event) {
  switch (event.event) {
    case EVENT_AGENT_CONNECTED:
      return eventHandlers.agentConnected(state, event);
    case EVENT_AGENT_DISCONNECTED:
      return eventHandlers.agentDisconnected(state, event);
    case EVENT_ENVS_UPDATED:
      return eventHandlers.envsUpdated(state, event);
    default:
      return state;
  }
}
