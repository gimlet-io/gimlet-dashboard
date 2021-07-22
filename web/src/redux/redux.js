import * as eventHandlers from './eventHandlers';

export const ACTION_TYPE_STREAMING = 'streaming';
export const ACTION_TYPE_ENVS = 'envs';
export const ACTION_TYPE_USER = 'user';
export const ACTION_TYPE_GIMLETD = 'gimletd';
export const ACTION_TYPE_SEARCH = 'search';

export const EVENT_AGENT_CONNECTED = 'agentConnected';
export const EVENT_AGENT_DISCONNECTED = 'agentDisconnected';
export const EVENT_ENVS_UPDATED = 'envsUpdated';

export const initialState = {
  settings: {
    agents: []
  },
  envs: {},
  search: {filter: ''}
};

export function rootReducer(state = initialState, action) {
  switch (action.type) {
    case ACTION_TYPE_STREAMING:
      return processStreamingEvent(state, action.payload)
    case ACTION_TYPE_ENVS:
      return eventHandlers.envsUpdated(state, action.payload)
    case ACTION_TYPE_USER:
      return eventHandlers.user(state, action.payload)
    case ACTION_TYPE_GIMLETD:
      return eventHandlers.gimletd(state, action.payload)
    case ACTION_TYPE_SEARCH:
      return eventHandlers.search(state, action.payload)
    default:
      console.log('Could not process redux event: ' + JSON.stringify(action));
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
      return eventHandlers.envsUpdated(state, event.envs);
    default:
      return state;
  }
}
