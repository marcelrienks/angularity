#!/bin/bash

################################################################################
# AWS Infrastructure Setup for MX5 Alignment Tool
# 
# Creates S3 bucket + CloudFront distribution for production deployment
# Usage: bash scripts/setup-aws-infrastructure.sh
#
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 MX5 Alignment AWS Infrastructure Setup${NC}"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v aws &> /dev/null || { echo -e "${RED}❌ AWS CLI not found. Install with: brew install awscli${NC}"; exit 1; }
aws --version | head -1
echo ""

# Configuration
read -p "Enter AWS region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

read -p "Enter S3 bucket name (must be globally unique): " S3_BUCKET_NAME
if [ -z "$S3_BUCKET_NAME" ]; then
  echo -e "${RED}❌ Bucket name required${NC}"
  exit 1
fi

read -p "Enter CloudFront comment/identifier (e.g., mx5-alignment-prod): " CF_COMMENT
CF_COMMENT=${CF_COMMENT:-mx5-alignment}

echo ""
echo -e "${YELLOW}📝 Configuration Summary:${NC}"
echo "  AWS Region: $AWS_REGION"
echo "  S3 Bucket: $S3_BUCKET_NAME"
echo "  CloudFront Comment: $CF_COMMENT"
echo ""

read -p "Continue with setup? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Setup cancelled."
  exit 0
fi

# Step 1: Create S3 Bucket
echo ""
echo -e "${GREEN}📦 Step 1: Creating S3 bucket...${NC}"
aws s3api create-bucket \
  --bucket "$S3_BUCKET_NAME" \
  --region "$AWS_REGION" \
  $(if [ "$AWS_REGION" != "us-east-1" ]; then echo --create-bucket-configuration LocationConstraint="$AWS_REGION"; fi) \
  || echo "ℹ️  Bucket may already exist"

# Step 2: Configure S3 bucket for static hosting
echo -e "${GREEN}🔧 Step 2: Configuring S3 bucket policy...${NC}"

# Create bucket policy JSON
BUCKET_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${S3_BUCKET_NAME}/*"
    }
  ]
}
EOF
)

# Put bucket policy
echo "$BUCKET_POLICY" > /tmp/bucket-policy.json
aws s3api put-bucket-policy \
  --bucket "$S3_BUCKET_NAME" \
  --policy file:///tmp/bucket-policy.json \
  --region "$AWS_REGION"
echo "✓ Bucket policy configured"

# Step 3: Enable static website hosting
echo -e "${GREEN}🌐 Step 3: Enabling static website hosting...${NC}"

aws s3api put-bucket-website \
  --bucket "$S3_BUCKET_NAME" \
  --website-configuration '{
    "IndexDocument": {
      "Suffix": "index.html"
    },
    "ErrorDocument": {
      "Key": "index.html"
    }
  }' \
  --region "$AWS_REGION"
echo "✓ Static website hosting enabled"

# Step 4: Upload site files to S3
echo -e "${GREEN}📤 Step 4: Uploading site files to S3...${NC}"

if [ ! -d "site" ]; then
  echo -e "${RED}❌ site/ directory not found. Are you in the project root?${NC}"
  exit 1
fi

aws s3 sync site/ "s3://${S3_BUCKET_NAME}/" \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=3600" \
  --exclude ".gitignore" \
  --delete

echo "✓ Site files uploaded"

# Step 5: Create CloudFront Origin Access Control (OAC)
echo -e "${GREEN}🔒 Step 5: Creating CloudFront Origin Access Control...${NC}"

OAC_CONFIG=$(cat <<EOF
{
  "Name": "mx5-alignment-oac",
  "Description": "OAC for MX5 Alignment S3 bucket",
  "SigningProtocol": "sigv4",
  "SigningBehavior": "always",
  "OriginAccessControlOriginType": "s3"
}
EOF
)

echo "$OAC_CONFIG" > /tmp/oac-config.json
OAC_ID=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config file:///tmp/oac-config.json \
  --query 'OriginAccessControl.Id' \
  --output text)

echo "✓ OAC created: $OAC_ID"

# Step 6: Create CloudFront distribution
echo -e "${GREEN}☁️  Step 6: Creating CloudFront distribution...${NC}"

CF_CONFIG=$(cat <<EOF
{
  "CallerReference": "$(date +%s)",
  "Comment": "$CF_COMMENT",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "MyS3Origin",
        "DomainName": "${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginAccessControlId": "$OAC_ID"
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "MyS3Origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 3600,
    "MaxTTL": 86400
  },
  "CacheBehaviors": [],
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
EOF
)

echo "$CF_CONFIG" > /tmp/cf-config.json
CF_DIST_ID=$(aws cloudfront create-distribution \
  --distribution-config file:///tmp/cf-config.json \
  --query 'Distribution.Id' \
  --output text)

echo "✓ CloudFront distribution created"
echo "  Distribution ID: $CF_DIST_ID"

# Step 7: Update S3 bucket policy to allow CloudFront access
echo -e "${GREEN}⚙️  Step 7: Updating S3 bucket policy for CloudFront...${NC}"

UPDATED_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${S3_BUCKET_NAME}/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::$(aws sts get-caller-identity --query 'Account' --output text):distribution/${CF_DIST_ID}"
        }
      }
    },
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${S3_BUCKET_NAME}/*"
    }
  ]
}
EOF
)

echo "$UPDATED_POLICY" > /tmp/updated-policy.json
aws s3api put-bucket-policy \
  --bucket "$S3_BUCKET_NAME" \
  --policy file:///tmp/updated-policy.json \
  --region "$AWS_REGION"
echo "✓ S3 bucket policy updated"

# Step 8: Get CloudFront domain
echo ""
echo -e "${GREEN}✅ Infrastructure setup complete!${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo ""
echo "1. Wait for CloudFront distribution to deploy (5-10 minutes)"
echo "   Check status: aws cloudfront get-distribution --id $CF_DIST_ID"
echo ""
echo "2. Get your CloudFront domain:"
echo "   aws cloudfront get-distribution --id $CF_DIST_ID --query 'Distribution.DomainName' --output text"
echo ""
echo "3. Test your deployment:"
echo "   https://[cloudfront-domain-name]"
echo ""
echo "4. Add to GitHub Secrets:"
echo "   CLOUDFRONT_DISTRIBUTION_ID: $CF_DIST_ID"
echo ""
echo "5. (Optional) Set up custom domain in Route 53"
echo ""
echo -e "${YELLOW}📝 Save this information:${NC}"
echo "  S3 Bucket: $S3_BUCKET_NAME"
echo "  CloudFront Distribution ID: $CF_DIST_ID"
echo "  AWS Region: $AWS_REGION"
echo ""
echo "Add these to a .env.local file or GitHub Secrets for future deployments."
echo ""

# Cleanup
rm -f /tmp/bucket-policy.json /tmp/oac-config.json /tmp/cf-config.json /tmp/updated-policy.json

echo -e "${GREEN}🎉 Setup complete!${NC}"
