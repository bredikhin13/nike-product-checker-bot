resource "aws_apigatewayv2_api" "telegram_webhook" {
  name          = "telegram-webhook-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.telegram_webhook.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.telegram_webhook.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "webhook" {
  api_id        = aws_apigatewayv2_api.telegram_webhook.id
  route_key     = "POST /telegram"
  authorizer_id = aws_apigatewayv2_authorizer.telegram.id
  target        = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.telegram_webhook.id
  name        = "$default"
  auto_deploy = true
  default_route_settings {
    throttling_rate_limit  = 100
    throttling_burst_limit = 100
  }
}

resource "aws_apigatewayv2_authorizer" "telegram" {
  api_id          = aws_apigatewayv2_api.telegram_webhook.id
  name            = "telegram-authorizer"
  authorizer_type = "REQUEST"

  identity_sources = [
    "route.request.header.X-Telegram-Bot-Api-Secret-Token"
  ]

  authorizer_uri = aws_lambda_function.authorizer.invoke_arn

  authorizer_payload_format_version = "2.0"

  enable_simple_responses          = false
  authorizer_result_ttl_in_seconds = 0
}
