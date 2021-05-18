GO_VERSION=1.16
GOFILES = $(shell find . -type f -name '*.go' -not -path "./.git/*")
LDFLAGS = '-s -w -extldflags "-static" -X github.com/gimlet-io/gimlet-dashboard/version.Version='${VERSION}

DOCKER_RUN?=
_with-docker:
	$(eval DOCKER_RUN=docker run --rm -v $(shell pwd):/go/src/github.com/gimlet-io/gimlet-dashboard -w /go/src/github.com/gimlet-io/gimlet-dashboard golang:$(GO_VERSION))

.PHONY: all format-backend test-backend  build-frontend build-backend dist

all: build-frontend test-backend build-backend

format-backend:
	@gofmt -w ${GOFILES}

test-backend:
	$(DOCKER_RUN) go test -race -timeout 60s $(shell go list ./... )

build-backend:
	$(DOCKER_RUN) CGO_ENABLED=0 go build -ldflags $(LDFLAGS) -o build/gimlet github.com/gimlet-io/gimlet-dashboard/cmd

dist:
	mkdir -p bin
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags $(LDFLAGS) -a -installsuffix cgo -o bin/gimlet-dashboard-linux-x86_64 github.com/gimlet-io/gimlet-dashboard/cmd
	CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -ldflags $(LDFLAGS) -a -installsuffix cgo -o bin/gimlet-dashboard-darwin-x86_64 github.com/gimlet-io/gimlet-dashboard/cmd
	CGO_ENABLED=0 GOOS=linux GOARCH=arm GOARM=6 go build -ldflags $(LDFLAGS) -a -installsuffix cgo -o bin/gimlet-dashboard-linux-armhf github.com/gimlet-io/gimlet-dashboard/cmd
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags $(LDFLAGS) -a -installsuffix cgo -o bin/gimlet-dashboard-linux-arm64 github.com/gimlet-io/gimlet-dashboard/cmd
	CGO_ENABLED=0 GOOS=windows go build -ldflags $(LDFLAGS) -a -installsuffix cgo -o bin/gimlet.exe github.com/gimlet-io/gimlet-dashboard/cmd

fast-dist:
	mkdir -p bin
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags $(LDFLAGS) -a -installsuffix cgo -o bin/gimlet-dashboard-linux-x86_64 github.com/gimlet-io/gimlet-dashboard/cmd
	CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -ldflags $(LDFLAGS) -a -installsuffix cgo -o bin/gimlet-dashboard-darwin-x86_64 github.com/gimlet-io/gimlet-dashboard/cmd

build-frontend:
	(cd web/; npm install; npm run build)

test-frontend:
	(cd web/; npm install; npm run test)

