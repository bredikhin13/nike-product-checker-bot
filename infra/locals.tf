locals {
  lambda_functions = {
    product_checker = aws_lambda_function.product_checker.function_name
    telegram_webhook = aws_lambda_function.telegram_webhook.function_name
    authorizer = aws_lambda_function.authorizer.function_name
  }

  logs_retantion_days = 30
}