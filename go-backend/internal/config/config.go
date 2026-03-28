package config

import "os"

// Config holds all application configuration loaded from environment variables.
type Config struct {
	Port      string
	APIKey    string
	CouponDir string
	LogLevel  string
}

// Load reads environment variables and returns a Config with sensible defaults.
func Load() *Config {
	return &Config{
		Port:      getEnv("PORT", "8080"),
		APIKey:    getEnv("API_KEY", "apitest"),
		CouponDir: getEnv("COUPON_DIR", "./data"),
		LogLevel:  getEnv("LOG_LEVEL", "info"),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
