package config

import (
	"github.com/kelseyhightower/envconfig"
	"gopkg.in/yaml.v2"
)

// Environ returns the settings from the environment.
func Environ() (*Config, error) {
	cfg := Config{}
	err := envconfig.Process("", &cfg)
	defaultDB(&cfg)

	return &cfg, err
}

func defaultDB(c *Config) {
	if c.Database.Driver == "" {
		c.Database.Driver = "sqlite3"
	}
	if c.Database.Config == "" {
		c.Database.Config = "gimlet-dashboard.sqlite"
	}
}

// String returns the configuration in string format.
func (c *Config) String() string {
	out, _ := yaml.Marshal(c)
	return string(out)
}

type Config struct {
	Logging   Logging
	Host      string `envconfig:"HOST"`
	JWTSecret string `envconfig:"JWT_SECRET"`
	Github    Github
	Database  Database
}

// Logging provides the logging configuration.
type Logging struct {
	Debug bool `envconfig:"DEBUG"`
	Trace bool `envconfig:"TRACE"`
}

type Github struct {
	ClientID     string `envconfig:"GITHUB_CLIENT_ID"`
	ClientSecret string `envconfig:"GITHUB_CLIENT_SECRET"`
	SkipVerify   bool   `envconfig:"GITHUB_SKIP_VERIFY"`
	Debug        bool   `envconfig:"GITHUB_DEBUG"`
	Org          string `envconfig:"GITHUB_ORG"`
}

type Database struct {
	Driver string `envconfig:"DATABASE_DRIVER"`
	Config string `envconfig:"DATABASE_CONFIG"`
}
