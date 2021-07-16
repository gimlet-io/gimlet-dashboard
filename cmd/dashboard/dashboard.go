package main

import (
	"crypto/tls"
	"fmt"
	"github.com/drone/go-scm/scm"
	"github.com/drone/go-scm/scm/driver/github"
	"github.com/drone/go-scm/scm/transport/oauth2"
	"github.com/gimlet-io/gimlet-dashboard/cmd/dashboard/config"
	"github.com/gimlet-io/gimlet-dashboard/server"
	oauth22 "github.com/gimlet-io/gimlet-dashboard/server/oauth2"
	"github.com/gimlet-io/gimlet-dashboard/store"
	"github.com/joho/godotenv"
	log "github.com/sirupsen/logrus"
	"net/http"
	"net/http/httputil"
	"path"
	"runtime"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Warnf("could not load .env file, relying on env vars")
	}

	config, err := config.Environ()
	if err != nil {
		log.Fatalln("main: invalid configuration")
	}

	initLogger(config)
	if log.IsLevelEnabled(log.TraceLevel) {
		log.Traceln(config.String())
	}

	if config.Host == "" {
		panic(fmt.Errorf("please provide the HOST variable"))
	}
	if config.JWTSecret == "" {
		panic(fmt.Errorf("please provide the JWT_SECRET variable"))
	}

	agentHub := server.NewAgentHub(config)
	go agentHub.Run()

	clientHub := server.NewClientHub()
	go clientHub.Run()

	store := store.New(config.Database.Driver, config.Database.Config)

	git, refresher := gitClient(config)

	r := server.SetupRouter(config, agentHub, clientHub, store, git, refresher)
	http.ListenAndServe(":9000", r)
}

// helper function configures the logging.
func initLogger(c *config.Config) {
	log.SetReportCaller(true)

	customFormatter := &log.TextFormatter{
		CallerPrettyfier: func(f *runtime.Frame) (string, string) {
			filename := path.Base(f.File)
			return "", fmt.Sprintf("[%s:%d]", filename, f.Line)
		},
	}
	customFormatter.FullTimestamp = true
	log.SetFormatter(customFormatter)

	if c.Logging.Debug {
		log.SetLevel(log.DebugLevel)
	}
	if c.Logging.Trace {
		log.SetLevel(log.TraceLevel)
	}
}

func gitClient(config *config.Config) (*scm.Client, *oauth22.Refresher) {
	client, err := github.New("https://api.github.com")
	if err != nil {
		log.WithError(err).
			Fatalln("main: cannot create the GitHub client")
	}
	if config.Github.Debug {
		client.DumpResponse = httputil.DumpResponse
	}
	client.Client = &http.Client{
		Transport: &oauth2.Transport{
			Source: oauth2.ContextTokenSource(),
			Base:   defaultTransport(config.Github.SkipVerify),
		},
	}

	refresher := &oauth22.Refresher{
		ClientID:     config.Github.ClientID,
		ClientSecret: config.Github.ClientSecret,
		Endpoint:     "https://github.com/login/oauth/access_token",
		Source:       oauth2.ContextTokenSource(),
		Client:       client.Client,
	}

	return client, refresher
}

// defaultTransport provides a default http.Transport. If
// skipverify is true, the transport will skip ssl verification.
func defaultTransport(skipverify bool) http.RoundTripper {
	return &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: skipverify,
		},
	}
}
