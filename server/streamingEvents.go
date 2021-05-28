package server

import "github.com/gimlet-io/gimlet-dashboard/api"

const AgentConnectedEventString = "agentConnected"
const AgentDisconnectedEventString = "agentDisconnected"
const EnvsUpdatedEventString = "envsUpdated"

type StreamingEvent struct {
	Event string `json:"event"`
}

type AgentConnectedEvent struct {
	Agent ConnectedAgent `json:"agent"`
	StreamingEvent
}

type AgentDisconnectedEvent struct {
	Agent ConnectedAgent `json:"agent"`
	StreamingEvent
}

type EnvsUpdatedEvent struct {
	Envs []*api.Env `json:"envs"`
	StreamingEvent
}
