import * as eventHandlers from './eventHandlers/eventHandlers';
import * as podEventHandlers from './eventHandlers/podEventHandlers';
import * as deploymentEventHandlers from './eventHandlers/deploymentEventHandlers';
import * as ingressEventHandlers from './eventHandlers/ingressEventHandlers';

export const ACTION_TYPE_STREAMING = 'streaming';
export const ACTION_TYPE_ENVS = 'envs';
export const ACTION_TYPE_USER = 'user';
export const ACTION_TYPE_GIMLETD = 'gimletd';
export const ACTION_TYPE_SEARCH = 'search';
export const ACTION_TYPE_ROLLOUT_HISTORY = 'rolloutHistory';
export const ACTION_TYPE_COMMITS = 'commits';
export const ACTION_TYPE_BRANCHES = 'branches';

export const EVENT_AGENT_CONNECTED = 'agentConnected';
export const EVENT_AGENT_DISCONNECTED = 'agentDisconnected';
export const EVENT_ENVS_UPDATED = 'envsUpdated';

export const EVENT_POD_CREATED = 'podCreated';
export const EVENT_POD_UPDATED = 'podUpdated';
export const EVENT_POD_DELETED = 'podDeleted';

export const EVENT_DEPLOYMENT_CREATED = 'deploymentCreated';
export const EVENT_DEPLOYMENT_UPDATED = 'deploymentUpdated';
export const EVENT_DEPLOYMENT_DELETED = 'deploymentDeleted';

export const EVENT_INGRESS_CREATED = 'ingressCreated';
export const EVENT_INGRESS_UPDATED = 'ingressUpdated';
export const EVENT_INGRESS_DELETED = 'ingressDeleted';

export const initialState = {
  settings: {
    agents: []
  },
  envs: {},
  search: {filter: ''},
  rolloutHistory: {},
  commits: {},
  branches: {}
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
    case ACTION_TYPE_ROLLOUT_HISTORY:
      return eventHandlers.rolloutHistory(state, action.payload)
    case ACTION_TYPE_COMMITS:
      return eventHandlers.commits(state, action.payload)
    case ACTION_TYPE_BRANCHES:
      return eventHandlers.branches(state, action.payload)
    default:
      console.log('Could not process redux event: ' + JSON.stringify(action));
      return state;
  }
}

function processStreamingEvent(state, event) {
  console.log(event.event);

  switch (event.event) {
    case EVENT_AGENT_CONNECTED:
      return eventHandlers.agentConnected(state, event);
    case EVENT_AGENT_DISCONNECTED:
      return eventHandlers.agentDisconnected(state, event);
    case EVENT_ENVS_UPDATED:
      return eventHandlers.envsUpdated(state, event.envs);
    case EVENT_POD_CREATED:
      return podEventHandlers.podCreated(state, event);
    case EVENT_POD_UPDATED:
      return podEventHandlers.podUpdated(state, event);
    case EVENT_POD_DELETED:
      return podEventHandlers.podDeleted(state, event);
    case EVENT_DEPLOYMENT_CREATED:
      return deploymentEventHandlers.deploymentCreated(state, event);
    case EVENT_DEPLOYMENT_UPDATED:
      return deploymentEventHandlers.deploymentUpdated(state, event);
    case EVENT_DEPLOYMENT_DELETED:
      return deploymentEventHandlers.deploymentDeleted(state, event);
    case EVENT_INGRESS_CREATED:
      return ingressEventHandlers.ingressCreated(state, event);
    case EVENT_INGRESS_UPDATED:
      return ingressEventHandlers.ingressUpdated(state, event);
    case EVENT_INGRESS_DELETED:
      return ingressEventHandlers.ingressDeleted(state, event);
    default:
      console.log('Could not process streaming event: ' + JSON.stringify(event));
      return state;
  }
}
