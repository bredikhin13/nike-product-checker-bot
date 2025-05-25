variable "region" {
  default = "eu-central-1"
}

variable "telegram_token" {
  description = "Telegram Bot Token"
  type        = string
}

variable "table_name" {
  description = "DynamoDB table name"
  type        = string
}

variable "telegram_api_secret" {
  description = "Secret used to validate Telegram webhook"
  type        = string
}

variable "loki_url" {
  description = "URL for the Grafana Loki endpoint (e.g. https://logs-prod3.grafana.net/loki/api/v1/push)"
  type        = string
}

variable "loki_user" {
  description = "Grafana Loki user for basic authentication (typically numeric instance ID)"
  type        = string
}

variable "loki_pass" {
  description = "Grafana Loki password (API key)"
  type        = string
  sensitive   = true
}