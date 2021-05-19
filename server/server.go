package server

import (
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

	//broadcastAgentConnectedEvent(c, a)

	for {
		select {
		case <-r.Context().Done():
			agentHub.Unregister <- a
			//broadcastAgentDisconnectedEvent(c, a.Name)
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
