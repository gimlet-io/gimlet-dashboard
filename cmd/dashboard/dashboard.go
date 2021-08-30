package main

import (
	"fmt"
	"github.com/gimlet-io/gimlet-dashboard/cmd/dashboard/config"
	"github.com/gimlet-io/gimlet-dashboard/git/customScm"
	"github.com/gimlet-io/gimlet-dashboard/git/customScm/customGithub"
	"github.com/gimlet-io/gimlet-dashboard/git/genericScm"
	"github.com/gimlet-io/gimlet-dashboard/git/nativeGit"
	"github.com/gimlet-io/gimlet-dashboard/server"
	"github.com/gimlet-io/gimlet-dashboard/store"
	"github.com/go-chi/chi"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	log "github.com/sirupsen/logrus"
	"net/http"
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

	goScm := genericScm.NewGoScmHelper(config)

	var gitSvc customScm.CustomGitService
	var tokenManager customScm.NonImpersonatedTokenManager

	if config.IsGithub() {
		gitSvc = &customGithub.GithubClient{}
		tokenManager, err = customGithub.NewGithubOrgTokenManager(config)
		if err != nil {
			panic(err)
		}
	} else {
		panic("Github configuration must be provided")
	}

	stopCh := make(chan struct{})
	defer close(stopCh)

	repoCache, err := nativeGit.NewRepoCache(
		tokenManager,
		stopCh,
		config.RepoCachePath,
		goScm,
		config,
	)
	if err != nil {
		panic(err)
	}
	go repoCache.Run()
	log.Info("repo cache initialized")

	metricsRouter := chi.NewRouter()
	metricsRouter.Get("/metrics", promhttp.Handler().ServeHTTP)
	go http.ListenAndServe(":9001", metricsRouter)

	r := server.SetupRouter(
		config,
		agentHub,
		clientHub,
		store,
		goScm,
		gitSvc,
		tokenManager,
		repoCache,
	)
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
