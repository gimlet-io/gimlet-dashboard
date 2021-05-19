package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/sirupsen/logrus"
)

func register(URL string) (chan map[string]interface{}, error) {
	resp, err := httpClient().Get(URL)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("got response status code %d\n", resp.StatusCode)
	}

	events := make(chan map[string]interface{})
	reader := bufio.NewReader(resp.Body)

	go loop(reader, events)

	return events, nil
}

func loop(reader *bufio.Reader, events chan map[string]interface{}) {
	var buf bytes.Buffer

	for {
		line, err := reader.ReadBytes('\n')
		if err != nil {
			logrus.Errorf("error during resp.Body read:%s\n", err)
			close(events)
			return
		}

		switch {
		case hasPrefix(line, ":"):
		case hasPrefix(line, "data: "):
			buf.Write(line[6:])
		case bytes.Equal(line, []byte("\n")):
			b := buf.Bytes()
			if hasPrefix(b, "{") {
				var data map[string]interface{}
				err := json.Unmarshal(b, &data)
				if err == nil {
					buf.Reset()
					events <- data
				} else {
					logrus.Errorf("could not parse json: %s", line)
					close(events)
					return
				}
			}
		default:
			logrus.Errorf("could not parse event: %s", line)
			close(events)
			return
		}
	}
}

func hasPrefix(s []byte, prefix string) bool {
	return bytes.HasPrefix(s, []byte(prefix))
}
