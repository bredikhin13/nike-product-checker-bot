resource "aws_cloudwatch_event_rule" "every_minute" {
  name                = "every_minute"
  schedule_expression = "cron(0 9 * * ? *)"
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.every_minute.name
  target_id = "ProductChecker"
  arn       = aws_lambda_function.product_checker.arn
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.product_checker.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.every_minute.arn
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  for_each          = local.lambda_functions

  name              = "/aws/lambda/${each.value}"
  retention_in_days = local.logs_retantion_days
}

resource "aws_cloudwatch_log_subscription_filter" "logs_subscription" {
  for_each = local.lambda_functions

  name = "logs-subscription-for-${each.key}"
  log_group_name = "/aws/lambda/${each.value}"
  filter_pattern  = ""
  destination_arn = aws_lambda_function.logs_exporter.arn

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs
  ]
}