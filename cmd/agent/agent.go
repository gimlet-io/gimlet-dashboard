package main

import (
	"flag"
	"fmt"
	"github.com/gimlet-io/gimlet-dashboard/agent"
	log "github.com/sirupsen/logrus"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	_ "k8s.io/client-go/plugin/pkg/client/auth/azure"
	_ "k8s.io/client-go/plugin/pkg/client/auth/gcp"
	_ "k8s.io/client-go/plugin/pkg/client/auth/oidc"
	_ "k8s.io/client-go/plugin/pkg/client/auth/openstack"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"path"
	"path/filepath"
	"runtime"
)

func main() {
	configLogger()

	config, err := k8sConfig()
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}

	podListWatcher := cache.NewListWatchFromClient(clientset.CoreV1().RESTClient(), "pods", v1.NamespaceDefault, fields.Everything())
	podController := agent.NewController("pod", podListWatcher, &v1.Pod{}, func(indexer cache.Indexer, key string) error {
		obj, exists, err := indexer.GetByKey(key)
		if err != nil {
			log.Errorf("Fetching object with key %s from store failed with %v", key, err)
			return err
		}

		if !exists {
			// Below we will warm up our cache with a Pod, so that we will see a delete for one pod
			fmt.Printf("Pod %s does not exist anymore\n", key)
		} else {
			// Note that you also have to check the uid if you have a local controlled resource, which
			// is dependent on the actual instance, to detect that a Pod was recreated with the same name
			fmt.Printf("Sync/Add/Update for Pod %s\n", obj.(*v1.Pod).GetName())
		}
		return nil
	})

	// Now let's start the controller
	stop := make(chan struct{})
	defer close(stop)
	go podController.Run(1, stop)

	// Wait forever
	select {}
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

func configLogger() {
	log.SetReportCaller(true)
	customFormatter := &log.TextFormatter{
		CallerPrettyfier: func(f *runtime.Frame) (string, string) {
			filename := path.Base(f.File)
			return "", fmt.Sprintf("[%s:%d]", filename, f.Line)
		},
	}
	customFormatter.FullTimestamp = true
	log.SetFormatter(customFormatter)
}
