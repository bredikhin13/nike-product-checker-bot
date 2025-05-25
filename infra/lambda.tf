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
