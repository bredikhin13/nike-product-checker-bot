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
  