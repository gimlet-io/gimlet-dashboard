module github.com/gimlet-io/gimlet-dashboard

go 1.16

require (
	github.com/dgrijalva/jwt-go v3.2.0+incompatible
	github.com/gimlet-io/gimletd v0.8.0
	github.com/gimlet-io/go-scm v1.7.1-0.20211007095331-cab5866f4eee
	github.com/go-chi/chi v1.5.4
	github.com/go-chi/chi/v5 v5.0.3
	github.com/go-chi/cors v1.2.0
	github.com/go-chi/jwtauth/v5 v5.0.1
	github.com/go-git/go-git/v5 v5.3.0
	github.com/go-sql-driver/mysql v1.6.0
	github.com/gomodule/redigo v2.0.0+incompatible // indirect
	github.com/google/go-github/v37 v37.0.0
	github.com/gorilla/securecookie v1.1.1
	github.com/gorilla/websocket v1.4.2
	github.com/joho/godotenv v1.4.0
	github.com/kelseyhightower/envconfig v1.4.0
	github.com/kevinburke/ssh_config v1.1.0 // indirect
	github.com/laszlocph/go-login v1.0.4-0.20200901120411-b6d05e420c8a
	github.com/lib/pq v1.10.4
	github.com/mattn/go-sqlite3 v2.0.3+incompatible
	github.com/otiai10/copy v1.7.0
	github.com/pkg/errors v0.9.1
	github.com/prometheus/client_golang v1.11.0
	github.com/russross/meddler v1.0.1
	github.com/sergi/go-diff v1.2.0 // indirect
	github.com/shurcooL/githubv4 v0.0.0-20210725200734-83ba7b4c9228
	github.com/shurcooL/graphql v0.0.0-20200928012149-18c5c3165e3a // indirect
	github.com/sirupsen/logrus v1.8.1
	github.com/stretchr/testify v1.7.0
	github.com/xanzy/ssh-agent v0.3.1 // indirect
	golang.org/x/net v0.0.0-20211201190559-0a0e4e1bb54c
	golang.org/x/oauth2 v0.0.0-20211104180415-d3ed0bb246c8
	gopkg.in/yaml.v2 v2.4.0
	gopkg.in/yaml.v3 v3.0.0-20210107192922-496545a6307b // indirect
	k8s.io/api v0.22.4
	k8s.io/apimachinery v0.22.4
	k8s.io/client-go v0.22.1
)

replace github.com/go-git/go-git/v5 => github.com/gimlet-io/go-git/v5 v5.2.1-0.20210917081253-a2ab483ba818
