export function agentConnected(state, event) {
  state.settings.agents.push(event.agent);
  return state;
}

export function agentDisconnected(state, event) {
  state.settings.agents = state.settings.agents.filter(agent => agent.name !== event.agent.name);
  return state;
}

export function envsUpdated(state, envs) {
  console.log("envs received")
  envs.forEach((env) => {
    state.envs[env.name] = env;
  });
  state.envs.loaded = true;
  return state;
}
