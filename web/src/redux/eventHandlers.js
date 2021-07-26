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

export function gimletd(state, gimletd) {
  state.gimletd = gimletd;
  return state;
}

export function search(state, search) {
  state.search = search;
  return state;
}

export function podCreated(state, event) {
  const env = event.env;
  const namespace = event.subject.split('/')[0];
  const podName = event.subject.split('/')[1];

  if (state.envs[env] === undefined) {
    return state;
  }

  state.envs[env].stacks.forEach((stack, stackID, stacks) => {
    if (stack.service.namespace + '/' + stack.service.name !== event.svc) {
      return;
    }
    if (!stack.deployment) {
      console.log({msg: 'Deployment missing, not processing podUpdate', state, event});
      return;
    }
    if (stack.deployment.namespace + '/' + stack.deployment.name !== event.deployment) {
      return;
    }

    if (!deploymentHasPod(stack.deployment, event.subject)) {
      if (!stack.deployment.pods) {
        stack.deployment.pods = [];
      }
      stack.deployment.pods.push({
        name: podName,
        namespace: namespace,
        status: event.status
      });
    }
  });


  return state
}

export function podUpdated(state, event) {
  const env = event.env;
  const namespace = event.subject.split('/')[0];
  const podName = event.subject.split('/')[1];

  if (state.envs[env] === undefined) {
    return state;
  }

  state.envs[env].stacks.forEach((stack, stackID, stacks) => {
    if (!stack.deployment) {
      console.log({msg: 'Deployment missing, not processing podUpdate', state, event});
      return state;
    }
    stack.deployment.pods.forEach((pod, podID) => {
      if (pod.namespace + '/' + pod.name === event.subject) {
        stacks[stackID].deployment.pods[podID] = {
          name: podName,
          namespace: namespace,
          status: event.status,
          errorCause: event.errorCause,
          logs: event.logs
        };
      }
    });
  });
  return state;
}

export function podDeleted(state, event) {
  const env = event.env;

  if (state.envs[env] === undefined) {
    return state;
  }

  console.log('trying to delete')

  state.envs[env].stacks.forEach((stack, stackID, stacks) => {
    let toRemove = undefined;
    stack.deployment.pods.forEach((pod, podID) => {
      if (pod.namespace + '/' + pod.name === event.subject) {
        toRemove = podID;
      }
    });
    if (toRemove !== undefined) {
      stack.deployment.pods.splice(toRemove, 1);
    }
  });

  return state;
}

function deploymentHasPod(deployment, podName) {
  if (deployment.pods === undefined) {
    return false;
  }

  for (let pod of deployment.pods) {
    if (pod.name === podName) {
      return true;
    }
  }

  return false;
}
