#!/bin/bash

# CloudFormation Template Validation
# Validates the CloudFormation template syntax before deployment

set -e

TEMPLATE_PATH="${1:-.cloudformation/template.yaml}"

echo "Validating CloudFormation template: $TEMPLATE_PATH"

if [ ! -f "$TEMPLATE_PATH" ]; then
  echo "ERROR: Template file not found: $TEMPLATE_PATH"
  exit 1
fi

# Run AWS CloudFormation validation
aws cloudformation validate-template \
  --template-body file://"$TEMPLATE_PATH" \
  --region us-east-1

if [ $? -eq 0 ]; then
  echo "✓ CloudFormation template is valid"
  exit 0
else
  echo "✗ CloudFormation template validation failed"
  exit 1
fi
