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