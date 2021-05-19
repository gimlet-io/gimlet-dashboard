package agent

import (
	"fmt"
	log "github.com/sirupsen/logrus"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/cache"
)

func PodController(clientset kubernetes.Interface) *Controller {
	podListWatcher := cache.NewListWatchFromClient(clientset.CoreV1().RESTClient(), "pods", v1.NamespaceAll, fields.Everything())
	podController := NewController("pod", podListWatcher, &v1.Pod{}, func(indexer cache.Indexer, key string) error {
		obj, exists, err := indexer.GetByKey(key)
		if err != nil {
			log.Errorf("Fetching object with key %s from store failed with %v", key, err)
			return err
		}

		if !exists {
			fmt.Printf("Pod %s does not exist anymore\n", key)
		} else {
			fmt.Printf("Sync/Add/Update for Pod %s\n", obj.(*v1.Pod).GetName())
		}
		return nil
	})
	return podController
}
