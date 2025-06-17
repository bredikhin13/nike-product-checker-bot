resource "aws_dynamodb_table" "links" {
  name         = "Links"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "url"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "url"
    type = "S"
  }
}

resource "aws_dynamodb_table" "tf_lock" {
  name         = "tf_state_lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_dynamodb_table" "pending_selections" {
  name         = "PendingSelections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "pid"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "pid"
    type = "S"
  }
}
  