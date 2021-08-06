package config

import (
	"github.com/kelseyhightower/envconfig"
	"gopkg.in/yaml.v2"
	"strings"
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
	GimletD   GimletD
}

// Logging provides the logging configuration.
type Logging struct {
	Debug bool `envconfig:"DEBUG"`
	Trace bool `envconfig:"TRACE"`
}

type Github struct {
	AppID          string    `envconfig:"GITHUB_APP_ID"`
	InstallationID string    `envconfig:"GITHUB_INSTALLATION_ID"`
	PrivateKey     Multiline `envconfig:"GITHUB_PRIVATE_KEY"`
	WebhookSecret  string    `envconfig:"GITHUB_WEBHOOK_SECRET"`
	ClientID       string    `envconfig:"GITHUB_CLIENT_ID"`
	ClientSecret   string    `envconfig:"GITHUB_CLIENT_SECRET"`
	SkipVerify     bool      `envconfig:"GITHUB_SKIP_VERIFY"`
	Debug          bool      `envconfig:"GITHUB_DEBUG"`
	Org            string    `envconfig:"GITHUB_ORG"`
}

type Database struct {
	Driver string `envconfig:"DATABASE_DRIVER"`
	Config string `envconfig:"DATABASE_CONFIG"`
}

type GimletD struct {
	URL   string `envconfig:"GIMLETD_URL"`
	TOKEN string `envconfig:"GIMLETD_TOKEN"`
}

func (c *Config) IsGithub() bool {
	return c.Github.AppID != ""
}

type Multiline string

func (m *Multiline) Decode(value string) error {
	value = strings.ReplaceAll(value, "\\n", "\n")
	*m = Multiline(value)
	return nil
}

func (m *Multiline) String() string {
	return string(*m)
}
