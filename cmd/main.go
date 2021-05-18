package main

import (
	"github.com/gimlet-io/gimlet-dashboard/router"
	"net/http"
)

func main() {
	r := router.SetupRouter()
	http.ListenAndServe(":9000", r)
}
