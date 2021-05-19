package main

import (
	"flag"
	"fmt"
	"github.com/gimlet-io/gimlet-dashboard/agent"
	"github.com/gimlet-io/gimlet-dashboard/cmd/agent/config"
	"github.com/joho/godotenv"
	log "github.com/sirupsen/logrus"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	_ "k8s.io/client-go/plugin/pkg/client/auth/azure"
	_ "k8s.io/client-go/plugin/pkg/client/auth/gcp"
	_ "k8s.io/client-go/plugin/pkg/client/auth/oidc"
	_ "k8s.io/client-go/plugin/pkg/client/auth/openstack"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"os"
	"os/signal"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
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
	if config.AgentKey == "" {
		panic(fmt.Errorf("please provide the AGENT_KEY variable"))
	}
	if config.Env == "" {
		panic(fmt.Errorf("please provide the ENV variable"))
	}

	envName, namespace, err := parseEnvString(config.Env)
	if err != nil {
		panic(fmt.Errorf("invalid ENV variable. Format is env1=ns1,env2=ns2"))
	}

	if namespace != "" {
		log.Infof("Initializing %s agent in %s namespace scope", envName, namespace)
	} else {
		log.Infof("Initializing %s agent in cluster scope", envName)
	}

	k8sConfig, err := k8sConfig()
	clientset, err := kubernetes.NewForConfig(k8sConfig)
	if err != nil {
		panic(err.Error())
	}

	podController := agent.PodController(clientset)

	stopCh := make(chan struct{})
	defer close(stopCh)

	go podController.Run(1, stopCh)

	signals := make(chan os.Signal, 1)
	done := make(chan bool, 1)

	signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)

	// This goroutine executes a blocking receive for signals.
	// When it gets one it’ll print it out and then notify the program that it can finish.
	go func() {
		sig := <-signals
		log.Info(sig)
		done <- true
	}()

	log.Info("Initialized")
	<-done
	log.Info("Exiting")
}

func k8sConfig() (*rest.Config, error) {
	config, err := rest.InClusterConfig()
	if err != nil {
		log.Infof("In-cluster-config didn't work (%s), loading kubeconfig if available", err.Error())

		var kubeconfig *string
		if home := homedir.HomeDir(); home != "" {
			kubeconfig = flag.String("kubeconfig", filepath.Join(home, ".kube", "config"), "(optional) absolute path to the kubeconfig file")
		} else {
			kubeconfig = flag.String("kubeconfig", "", "absolute path to the kubeconfig file")
		}
		flag.Parse()

		// use the current context in kubeconfig
		config, err = clientcmd.BuildConfigFromFlags("", *kubeconfig)
		if err != nil {
			panic(err.Error())
		}
	}
	return config, err
}

// helper function configures the logging.
func initLogger(c config.Config) {
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

func parseEnvString(envString string) (string, string, error) {
	if strings.Contains(envString, "=") {
		parts := strings.Split(envString, "=")
		if len(parts) != 2 {
			return "", "", fmt.Errorf("")
		}
		return parts[0], parts[1], nil
	} else {
		return envString, "", nil
	}
}
