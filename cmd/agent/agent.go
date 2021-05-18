package main

import (
	"context"
	"flag"
	"fmt"
	"github.com/gimlet-io/gimlet-dashboard/agent"
	log "github.com/sirupsen/logrus"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	_ "k8s.io/client-go/plugin/pkg/client/auth/azure"
	_ "k8s.io/client-go/plugin/pkg/client/auth/gcp"
	_ "k8s.io/client-go/plugin/pkg/client/auth/oidc"
	_ "k8s.io/client-go/plugin/pkg/client/auth/openstack"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"path"
	"path/filepath"
	"runtime"
	"time"
)

func main() {
	configLogger()

	config, err := k8sConfig()
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		panic(err.Error())
	}

	podController := agent.PodController(clientset)

	stop := make(chan struct{})
	defer close(stop)
	go podController.Run(1, stop)

	p := &v1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: "my-pod"},
		Spec: v1.PodSpec{
			Containers: []v1.Container{
				{
					Name:  "web",
					Image: "nginx:1.12",
					Ports: []v1.ContainerPort{
						{
							Name:          "http",
							Protocol:      v1.ProtocolTCP,
							ContainerPort: 80,
						},
					},
				},
			},
		},
	}

	go func() {
		_, err = clientset.CoreV1().Pods("default").Create(context.TODO(), p, metav1.CreateOptions{})
		if err != nil {
			log.Error(err)
		}
		time.Sleep(3*time.Second)

		err = clientset.CoreV1().Pods("default").Delete(context.TODO(), p.Name, metav1.DeleteOptions{})
		if err != nil {
			log.Error(err)
		}
	}()

	//select{}
	time.Sleep(30 * time.Second)
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
