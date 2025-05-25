resource "aws_lambda_function" "product_checker" {
  function_name = "ProductChecker"
  runtime       = "nodejs20.x"
  handler       = "checker.handler"
  role          = aws_iam_role.lambda_exec_role.arn
  timeout       = 10

  filename         = "${path.module}/dist/lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/dist/lambda.zip")

  environment {
    variables = {
      TELEGRAM_TOKEN = var.telegram_token
    }
  }
}

resource "aws_lambda_function" "telegram_webhook" {
  function_name = "TelegramWebhook"
  runtime       = "nodejs20.x"
  handler       = "telegramWebhook.handler"

  filename         = "${path.module}/dist/lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/dist/lambda.zip")

  role = aws_iam_role.lambda_exec_role.arn

  environment {
    variables = {
      TELEGRAM_TOKEN = var.telegram_token
      TABLE_NAME     = var.table_name
    }
  }
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.telegram_webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.telegram_webhook.execution_arn}/*/*"
}

resource "aws_lambda_function" "authorizer" {
  function_name    = "telegram-authorizer"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "authorizer.handler"
  runtime          = "nodejs20.x"
  source_code_hash = filebase64sha256("${path.module}/dist/lambda.zip")

  filename = "${path.module}/dist/lambda.zip"

  environment {
    variables = {
      TELEGRAM_SECRET = var.telegram_api_secret
    }
  }
}

resource "aws_lambda_permission" "allow_apigw_invoke_authorizer" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.telegram_webhook.execution_arn}/*/*"
}

resource "aws_lambda_function" "logs_exporter" {
  function_name = "logs-exporter"
  handler       = "logsExporter.handler"
  runtime       = "nodejs20.x"
  filename      = "${path.module}/dist/lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/dist/lambda.zip")
  role          = aws_iam_role.lambda_exec_role.arn

  environment {
    variables = {
      LOKI_URL  = var.loki_url
      LOKI_USER = var.loki_user
      LOKI_PASS = var.loki_pass
    }
  }
}

resource "aws_lambda_permission" "logs_exporter_permission" {
  statement_id  = "AllowCloudWatchInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.logs_exporter.function_name
  principal     = "logs.${var.region}.amazonaws.com"
  source_arn    = "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:*"
}
