export function agentConnected(state, event) {
  state.settings.agents.push(event.agent);
  return state;
}

export function agentDisconnected(state, event) {
  state.settings.agents = state.settings.agents.filter(agent => agent.name !== event.agent.name);
  return state;
}

export function envsUpdated(state, envs) {
  envs.forEach((env) => {
    state.envs[env.name] = env;
  });
  return state;
}

export function user(state, user) {
  state.user = user;
  return state;
}
