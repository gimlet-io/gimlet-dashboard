package server

import (
	"encoding/json"
	"github.com/gimlet-io/gimlet-dashboard/api"
	log "github.com/sirupsen/logrus"
	"io"
	"net/http"
	"time"
)

func register(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	namespace := r.URL.Query().Get("namespace")

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	flusher, ok := w.(http.Flusher)
	if !ok {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Streaming not supported"))
		return
	}

	io.WriteString(w, ": ping\n\n")
	flusher.Flush()

	log.Debugf("agent connected: %s/%s", name, namespace)

	eventChannel := make(chan []byte, 10)
	defer func() {
		<-r.Context().Done()
		close(eventChannel)
		log.Debugf("agent disconnected: %s/%s", name, namespace)
	}()

	a := &ConnectedAgent{Name: name, Namespace: namespace, EventChannel: eventChannel}

	agentHub, _ := r.Context().Value("agentHub").(*AgentHub)
	agentHub.Register <- a

	clientHub, _ := r.Context().Value("clientHub").(*ClientHub)
	broadcastAgentConnectedEvent(clientHub, a)

	for {
		select {
		case <-r.Context().Done():
			agentHub.Unregister <- a
			broadcastAgentDisconnectedEvent(clientHub, a.Name)
			return
		case <-time.After(time.Second * 30):
			io.WriteString(w, ": ping\n\n")
			flusher.Flush()
		case buf, ok := <-eventChannel:
			if ok {
				io.WriteString(w, "data: ")
				w.Write(buf)
				io.WriteString(w, "\n\n")
				flusher.Flush()
			}
		}
	}
}

func broadcastAgentConnectedEvent(clientHub *ClientHub, a *ConnectedAgent) {
	jsonString, _ := json.Marshal(map[string]interface{}{
		"event": "agentConnected",
		"agent": a,
	})
	clientHub.Broadcast <- jsonString
}

func broadcastAgentDisconnectedEvent(clientHub *ClientHub, name string) {
	jsonString, _ := json.Marshal(map[string]interface{}{
		"event": "agentDisconnected",
		"agent": name,
	})
	clientHub.Broadcast <- jsonString
}

func state(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")

	var stacks []api.Stack
	err := json.NewDecoder(r.Body).Decode(&stacks)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(err.Error()))
		return
	}

	w.WriteHeader(http.StatusOK)

	agentHub, _ := r.Context().Value("agentHub").(*AgentHub)
	agent := agentHub.Agents[name]
	if agent == nil {
		time.Sleep(1 * time.Second) // Agenthub has a race condition. Registration is not done when the client sends the state
		agent = agentHub.Agents[name]
	}

	stackPointers := []*api.Stack{}
	for _, s := range stacks {
		copy := s // needed as the address of s is constant in the for loop
		stackPointers = append(stackPointers, &copy)
	}
	agent.Stacks = stackPointers

	envs := []*api.Env{{
		Name:   name,
		Stacks: stackPointers,
	}}

	clientHub, _ := r.Context().Value("clientHub").(*ClientHub)
	jsonString, _ := json.Marshal(map[string]interface{}{
		"event": "stacks",
		"envs":  envs,
	})
	clientHub.Broadcast <- jsonString
}
