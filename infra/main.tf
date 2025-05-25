provider "aws" {
  region = var.region
}

terraform {
  backend "s3" {
    bucket         = "tf-state-s3-bp-aws-account"
    key            = "state/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "tf_state_lock"
    encrypt        = true
  }
}