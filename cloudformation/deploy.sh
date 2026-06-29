#!/bin/bash

# CloudFormation Stack Deployment Script
# Creates or updates CloudFormation stack for S3 Subdomain Deployment

set -e

# Configuration
STACK_NAME="${STACK_NAME:-angularity-s3-deployment}"
TEMPLATE_FILE="${TEMPLATE_FILE:-cloudformation/template.yaml}"
PARAMETERS_FILE="${PARAMETERS_FILE:-cloudformation/parameters.json}"
REGION="${REGION:-us-east-1}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}CloudFormation Stack Deployment${NC}"
echo "Stack Name: $STACK_NAME"
echo "Template: $TEMPLATE_FILE"
echo "Parameters: $PARAMETERS_FILE"
echo "Region: $REGION"

# Verify template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
  echo -e "${RED}ERROR: Template file not found: $TEMPLATE_FILE${NC}"
  exit 1
fi

# Verify parameters file exists
if [ ! -f "$PARAMETERS_FILE" ]; then
  echo -e "${RED}ERROR: Parameters file not found: $PARAMETERS_FILE${NC}"
  exit 1
fi

# Validate template
echo -e "${BLUE}Validating CloudFormation template...${NC}"
aws cloudformation validate-template \
  --template-body file://"$TEMPLATE_FILE" \
  --region "$REGION" > /dev/null

echo -e "${GREEN}✓ Template valid${NC}"

# Check if stack exists
if aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" > /dev/null 2>&1; then

  echo -e "${BLUE}Stack exists. Updating...${NC}"
  ACTION="update-stack"
  WAIT_CONDITION="stack-update-complete"
else
  echo -e "${BLUE}Stack does not exist. Creating...${NC}"
  ACTION="create-stack"
  WAIT_CONDITION="stack-create-complete"
fi

# Deploy stack
echo -e "${BLUE}Deploying stack...${NC}"
aws cloudformation $ACTION \
  --stack-name "$STACK_NAME" \
  --template-body file://"$TEMPLATE_FILE" \
  --parameters file://"$PARAMETERS_FILE" \
  --region "$REGION"

# Wait for completion
echo -e "${BLUE}Waiting for stack operation to complete...${NC}"
aws cloudformation wait "$WAIT_CONDITION" \
  --stack-name "$STACK_NAME" \
  --region "$REGION"

echo -e "${GREEN}✓ Stack deployment complete${NC}"

# Display outputs
echo -e "${BLUE}Stack Outputs:${NC}"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
  --output table

echo -e "${GREEN}✓ Deployment successful${NC}"
