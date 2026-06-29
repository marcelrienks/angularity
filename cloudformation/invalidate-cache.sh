#!/bin/bash

# CloudFront Cache Invalidation Script
# Invalidates CloudFront cache to serve fresh app files

set -e

DISTRIBUTION_ID="${1:-}"
PATHS="${2:-/*}"

if [ -z "$DISTRIBUTION_ID" ]; then
  echo "Usage: $0 <distribution-id> [paths]"
  echo "Example: $0 E1234ABCD5678 '/*'"
  echo "Example: $0 E1234ABCD5678 '/index.html' '/input.html' '/site/js/*'"
  exit 1
fi

echo "Invalidating CloudFront cache"
echo "Distribution ID: $DISTRIBUTION_ID"
echo "Paths: $PATHS"

# Create invalidation
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "$PATHS" \
  --query 'Invalidation.Id' \
  --output text)

echo "Invalidation created: $INVALIDATION_ID"
echo "Status: In progress..."

# Wait for completion
aws cloudfront wait invalidation-completed \
  --distribution-id "$DISTRIBUTION_ID" \
  --id "$INVALIDATION_ID"

echo "✓ CloudFront cache invalidated. Changes visible in ~30 seconds."
