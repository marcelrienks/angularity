#!/bin/bash

# S3 Bucket Cleanup Script
# Empties S3 bucket before CloudFormation stack deletion

set -e

BUCKET_NAME="${1:-}"

if [ -z "$BUCKET_NAME" ]; then
  echo "Usage: $0 <bucket-name>"
  echo "Example: $0 alignment-123456789012"
  exit 1
fi

echo "Cleaning up S3 bucket: $BUCKET_NAME"

# Check if bucket exists
if ! aws s3 ls s3://"$BUCKET_NAME" > /dev/null 2>&1; then
  echo "ERROR: Bucket not found: $BUCKET_NAME"
  exit 1
fi

# Empty bucket (remove all objects and versions)
echo "Removing all objects..."
aws s3 rm s3://"$BUCKET_NAME" --recursive

echo "Removing all object versions..."
aws s3api list-object-versions \
  --bucket "$BUCKET_NAME" \
  --output text \
  --query 'Versions[*].[Key,VersionId]' |
while read KEY VERSION_ID; do
  if [ -n "$KEY" ] && [ -n "$VERSION_ID" ]; then
    aws s3api delete-object \
      --bucket "$BUCKET_NAME" \
      --key "$KEY" \
      --version-id "$VERSION_ID" > /dev/null
  fi
done

echo "Removing delete markers..."
aws s3api list-object-versions \
  --bucket "$BUCKET_NAME" \
  --output text \
  --query 'DeleteMarkers[*].[Key,VersionId]' |
while read KEY VERSION_ID; do
  if [ -n "$KEY" ] && [ -n "$VERSION_ID" ]; then
    aws s3api delete-object \
      --bucket "$BUCKET_NAME" \
      --key "$KEY" \
      --version-id "$VERSION_ID" > /dev/null
  fi
done

echo "✓ Bucket emptied. Ready for CloudFormation deletion."
echo ""
echo "Next: aws cloudformation delete-stack --stack-name angularity-s3-deployment"
