#!/bin/bash

################################################################################
# Manual Deployment Script for MX5 Alignment Tool
# 
# Deploys to S3 + invalidates CloudFront cache
# Usage: bash scripts/deploy.sh
#
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 MX5 Alignment Deployment Script${NC}"
echo ""

# Check prerequisites
if ! command -v aws &> /dev/null; then
  echo -e "${RED}❌ AWS CLI not found. Install with: brew install awscli${NC}"
  exit 1
fi

# Load configuration
S3_BUCKET_NAME="${S3_BUCKET_NAME:-mx5-alignment-prod}"
CLOUDFRONT_DIST_ID="${CLOUDFRONT_DIST_ID:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Allow overrides from command line
if [ "$1" != "" ]; then
  S3_BUCKET_NAME="$1"
fi

if [ "$2" != "" ]; then
  CLOUDFRONT_DIST_ID="$2"
fi

echo -e "${BLUE}📝 Configuration:${NC}"
echo "  S3 Bucket: $S3_BUCKET_NAME"
echo "  CloudFront ID: ${CLOUDFRONT_DIST_ID:-Not set (skipping invalidation)}"
echo "  AWS Region: $AWS_REGION"
echo ""

# Verify site/ directory exists
if [ ! -d "site" ]; then
  echo -e "${RED}❌ site/ directory not found. Are you in the project root?${NC}"
  exit 1
fi

# Run tests first
echo -e "${YELLOW}🧪 Running tests before deployment...${NC}"
npm run test:all-sync || {
  echo -e "${RED}❌ Tests failed. Deployment cancelled.${NC}"
  exit 1
}

echo -e "${GREEN}✓ All tests passed${NC}"
echo ""

# Deploy to S3
echo -e "${YELLOW}📤 Deploying to S3...${NC}"
aws s3 sync site/ "s3://${S3_BUCKET_NAME}/" \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=3600" \
  --delete \
  --exclude ".gitignore" \
  --exclude "*.json" \
  --exclude "*.md"

FILE_COUNT=$(find site/ -type f | wc -l)
echo -e "${GREEN}✓ Deployed $FILE_COUNT files to S3${NC}"
echo ""

# Invalidate CloudFront if ID is provided
if [ ! -z "$CLOUDFRONT_DIST_ID" ]; then
  echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DIST_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)
  
  echo -e "${GREEN}✓ Invalidation created: $INVALIDATION_ID${NC}"
  echo ""
  
  # Show status
  echo -e "${BLUE}📊 Invalidation Status:${NC}"
  aws cloudfront get-invalidation \
    --distribution-id "$CLOUDFRONT_DIST_ID" \
    --id "$INVALIDATION_ID" \
    --query 'Invalidation.[Id,CreateTime,Status]' \
    --output table
  
  echo ""
  echo -e "${YELLOW}⏱️  Cache will propagate globally in 2-5 minutes${NC}"
else
  echo -e "${YELLOW}ℹ️  CLOUDFRONT_DIST_ID not set. Skipping cache invalidation.${NC}"
  echo -e "${YELLOW}   To auto-invalidate, set: export CLOUDFRONT_DIST_ID=E1ABC2DEF34GHI${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "  1. Wait for CloudFront invalidation to complete (2-5 minutes)"
echo "  2. Test in browser: https://your-cloudfront-domain.cloudfront.net"
echo "  3. Verify all pages load and localStorage works"
echo "  4. Monitor CloudFront metrics in AWS Console"
echo ""

# Display helpful info
if [ ! -z "$CLOUDFRONT_DIST_ID" ]; then
  echo -e "${BLUE}📊 Check deployment status:${NC}"
  echo "  aws cloudfront get-invalidation --distribution-id $CLOUDFRONT_DIST_ID --id $INVALIDATION_ID"
  echo ""
fi

echo -e "${GREEN}🎉 Deployment queued successfully!${NC}"
