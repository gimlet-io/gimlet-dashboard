package server

import (
	"github.com/drone/go-scm/scm"
	"github.com/gimlet-io/gimlet-dashboard/cmd/dashboard/config"
	"github.com/gimlet-io/gimlet-dashboard/server/oauth2"
	"github.com/gimlet-io/gimlet-dashboard/server/session"
	"github.com/gimlet-io/gimlet-dashboard/store"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/jwtauth/v5"
	"github.com/laszlocph/go-login/login/github"
	"github.com/laszlocph/go-login/login/logger"
	log "github.com/sirupsen/logrus"
	"net/http"
	"strings"
)

var agentAuth *jwtauth.JWTAuth

func SetupRouter(
	config *config.Config,
	agentHub *AgentHub,
	clientHub *ClientHub,
	store *store.Store,
	git *scm.Client,
	refresher *oauth2.Refresher,
) *chi.Mux {
	agentAuth = jwtauth.New("HS256", []byte(config.JWTSecret), nil)
	_, tokenString, _ := agentAuth.Encode(map[string]interface{}{"user_id": "gimlet-agent"})
	log.Infof("Agent JWT is %s\n", tokenString)

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.NoCache)

	r.Use(middleware.WithValue("agentHub", agentHub))
	r.Use(middleware.WithValue("clientHub", clientHub))
	r.Use(middleware.WithValue("store", store))
	r.Use(middleware.WithValue("git", git))
	r.Use(middleware.WithValue("refresher", refresher))
	r.Use(middleware.WithValue("config", config))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:9000", "http://127.0.0.1:9000"},
		AllowedMethods:   []string{"GET", "POST"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	agentRoutes(r)
	userRoutes(r)
	githubOAuthRoutes(config, r)

	r.Get("/logout", logout)

	r.Get("/ws/", func(w http.ResponseWriter, r *http.Request) {
		ServeWs(clientHub, w, r)
	})

	filesDir := http.Dir("./web/build")
	fileServer(r, "/", filesDir)
	fileServer(r, "/login", filesDir)
	fileServer(r, "/repositories", filesDir)
	fileServer(r, "/environments", filesDir)

	return r
}

func userRoutes(r *chi.Mux) {
	r.Group(func(r chi.Router) {
		r.Use(session.SetUser())
		r.Use(session.SetCSRF())
		r.Use(session.MustUser())

		r.Get("/api/user", user)
		r.Get("/api/envs", envs)
	})
}

func agentRoutes(r *chi.Mux) {
	r.Group(func(r chi.Router) {
		r.Use(jwtauth.Verifier(agentAuth))
		r.Use(jwtauth.Authenticator)
		r.Use(mustAgent)

		r.Get("/agent/register", register)
		r.Post("/agent/state", state)
	})
}

func githubOAuthRoutes(config *config.Config, r *chi.Mux) {
	dumper := logger.DiscardDumper()
	if config.Github.Debug {
		dumper = logger.StandardDumper()
	}
	loginMiddleware := &github.Config{
		ClientID:     config.Github.ClientID,
		ClientSecret: config.Github.ClientSecret,
		Scope:        []string{"user:email,read:org"},
		Dumper:       dumper,
	}
	r.Handle("/auth", loginMiddleware.Handler(
		http.HandlerFunc(auth),
	))
	r.Handle("/auth/*", loginMiddleware.Handler(
		http.HandlerFunc(auth),
	))
}

// static files from a http.FileSystem
func fileServer(r chi.Router, path string, root http.FileSystem) {
	if strings.ContainsAny(path, "{}*") {
		//TODO: serve all React routes https://github.com/go-chi/chi/issues/403
		panic("FileServer does not permit any URL parameters.")
	}

	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
		path += "/"
	}
	path += "*"

	r.Get(path, func(w http.ResponseWriter, r *http.Request) {
		ctx := chi.RouteContext(r.Context())
		pathPrefix := strings.TrimSuffix(ctx.RoutePattern(), "/*")
		fs := http.StripPrefix(pathPrefix, http.FileServer(root))
		fs.ServeHTTP(w, r)
	})
}

func mustAgent(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, claims, _ := jwtauth.FromContext(r.Context())
		userId := claims["user_id"]
		if userId != "gimlet-agent" {
			http.Error(w, "Unauthorized", 401)
			return
		}

		next.ServeHTTP(w, r)
	})
}
