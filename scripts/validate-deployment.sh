#!/bin/bash

################################################################################
# Pre-Deployment Validation Script
# 
# Validates all prerequisites before deploying to production
# Usage: bash scripts/validate-deployment.sh [environment]
# 
# Exit codes:
#   0 = All checks passed
#   1 = One or more checks failed
#   2 = Critical check failed
#
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
CHECKS_TOTAL=0
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_CRITICAL=0

# Configuration
ENVIRONMENT="${1:-prod}"
CONFIG_FILE=".env.${ENVIRONMENT}.example"
if [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "production" ]; then
  CONFIG_FILE=".env.production.example"
  ENVIRONMENT="prod"
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Pre-Deployment Validation - $ENVIRONMENT Environment              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

################################################################################
# Helper Functions
################################################################################

check_pass() {
  local check_name="$1"
  ((CHECKS_PASSED++))
  ((CHECKS_TOTAL++))
  echo -e "${GREEN}✓${NC} $check_name"
}

check_fail() {
  local check_name="$1"
  ((CHECKS_FAILED++))
  ((CHECKS_TOTAL++))
  echo -e "${RED}✗${NC} $check_name"
}

check_critical() {
  local check_name="$1"
  ((CHECKS_FAILED++))
  ((CHECKS_CRITICAL++))
  ((CHECKS_TOTAL++))
  echo -e "${RED}⚠ CRITICAL${NC} $check_name"
}

warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

################################################################################
# System Prerequisites
################################################################################

echo -e "${YELLOW}📋 Checking System Prerequisites...${NC}"

# Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  check_pass "Node.js installed ($NODE_VERSION)"
else
  check_critical "Node.js not found (required)"
fi

# npm
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm --version)
  check_pass "npm installed ($NPM_VERSION)"
else
  check_critical "npm not found (required)"
fi

# Git
if command -v git &> /dev/null; then
  check_pass "Git installed ($(git --version | awk '{print $3}'))"
else
  check_fail "Git not found (recommended)"
fi

# AWS CLI
if command -v aws &> /dev/null; then
  AWS_VERSION=$(aws --version | awk '{print $1}')
  check_pass "AWS CLI installed ($AWS_VERSION)"
else
  check_fail "AWS CLI not found (install with: brew install awscli)"
fi

# Terraform (optional)
if command -v terraform &> /dev/null; then
  TF_VERSION=$(terraform version | head -1 | awk '{print $2}')
  check_pass "Terraform installed ($TF_VERSION)"
else
  warning "Terraform not found (use CloudFormation script or manual setup)"
fi

echo ""

################################################################################
# Project Structure
################################################################################

echo -e "${YELLOW}📁 Checking Project Structure...${NC}"

# Required directories
for dir in site js tests docs scripts .github infrastructure; do
  if [ -d "$dir" ]; then
    check_pass "Directory exists: $dir"
  else
    check_fail "Directory missing: $dir"
  fi
done

# Required files
for file in package.json README.md docs/DEPLOYMENT.md .github/workflows/deploy.yml; do
  if [ -f "$file" ]; then
    check_pass "File exists: $file"
  else
    check_fail "File missing: $file"
  fi
done

echo ""

################################################################################
# Build & Test Status
################################################################################

echo -e "${YELLOW}🔨 Checking Build & Test Status...${NC}"

# Dependencies installed
if [ -d "node_modules" ]; then
  check_pass "node_modules directory exists"
else
  warning "node_modules not found (run: npm install)"
  check_fail "Dependencies not installed"
fi

# Run tests
echo "Running integration tests..."
if npm run test:all-sync > /tmp/test-output.log 2>&1; then
  check_pass "All tests passing"
else
  check_critical "Tests failed (see logs for details)"
  tail -20 /tmp/test-output.log
fi

echo ""

################################################################################
# AWS Configuration
################################################################################

echo -e "${YELLOW}☁️  Checking AWS Configuration...${NC}"

# AWS credentials
if aws sts get-caller-identity > /dev/null 2>&1; then
  AWS_ACCOUNT=$(aws sts get-caller-identity --query 'Account' --output text)
  AWS_USER=$(aws sts get-caller-identity --query 'Arn' --output text)
  check_pass "AWS credentials configured (Account: $AWS_ACCOUNT)"
  info "IAM User: $AWS_USER"
else
  check_fail "AWS credentials not configured (run: aws configure)"
fi

# AWS region
if [ ! -z "$AWS_REGION" ]; then
  check_pass "AWS_REGION set to: $AWS_REGION"
elif [ ! -z "$(aws configure get region)" ]; then
  AWS_REGION=$(aws configure get region)
  check_pass "AWS region from config: $AWS_REGION"
else
  check_fail "AWS_REGION not set (set with: export AWS_REGION=us-east-1)"
fi

# S3 bucket exists (if provided)
if [ ! -z "$S3_BUCKET_NAME" ]; then
  if aws s3 ls "s3://$S3_BUCKET_NAME" > /dev/null 2>&1; then
    check_pass "S3 bucket accessible: $S3_BUCKET_NAME"
  else
    warning "S3 bucket not accessible: $S3_BUCKET_NAME (will be created during deployment)"
  fi
else
  info "S3_BUCKET_NAME not set (will auto-generate from account ID)"
fi

# CloudFront distribution (if deploying to existing)
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  if aws cloudfront get-distribution --id "$CLOUDFRONT_DISTRIBUTION_ID" > /dev/null 2>&1; then
    check_pass "CloudFront distribution accessible: $CLOUDFRONT_DISTRIBUTION_ID"
  else
    check_fail "CloudFront distribution not found: $CLOUDFRONT_DISTRIBUTION_ID"
  fi
else
  info "CLOUDFRONT_DISTRIBUTION_ID not set (will be created during deployment)"
fi

echo ""

################################################################################
# GitHub Configuration (if CI/CD)
################################################################################

if [ -d ".git" ]; then
  echo -e "${YELLOW}🐙 Checking GitHub Configuration...${NC}"
  
  ORIGIN=$(git config --get remote.origin.url)
  check_pass "Git repository configured: $ORIGIN"
  
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    check_pass "On main deployment branch: $BRANCH"
  else
    warning "Not on main branch (currently: $BRANCH)"
  fi
  
  # Check for uncommitted changes
  if [ -z "$(git status --porcelain)" ]; then
    check_pass "No uncommitted changes"
  else
    warning "Uncommitted changes detected (commit before pushing)"
    git status --short | head -5
  fi
  
  echo ""
fi

################################################################################
# Security Checks
################################################################################

echo -e "${YELLOW}🔐 Checking Security...${NC}"

# .env files not committed
if [ -f ".env" ] && git ls-files .env > /dev/null 2>&1; then
  check_critical ".env file committed to Git (security risk!)"
else
  check_pass ".env file not committed (good)"
fi

# AWS credentials not in environment
if [ ! -z "$AWS_ACCESS_KEY_ID" ] && [ ! -z "$AWS_SECRET_ACCESS_KEY" ]; then
  warning "AWS credentials in environment variables (consider rotating)"
fi

# .gitignore checks
if grep -q ".env" .gitignore 2>/dev/null; then
  check_pass ".gitignore includes .env files"
else
  check_fail ".gitignore missing .env exclusion"
fi

if grep -q "terraform.tfstate" .gitignore 2>/dev/null; then
  check_pass ".gitignore includes terraform state files"
else
  check_fail ".gitignore missing terraform state exclusion"
fi

echo ""

################################################################################
# Terraform Configuration (if using IaC)
################################################################################

if [ -d "infrastructure" ]; then
  echo -e "${YELLOW}🏗️  Checking Terraform Configuration...${NC}"
  
  if [ -f "infrastructure/terraform.tfvars" ]; then
    check_pass "Terraform variables file exists"
  elif [ -f "infrastructure/terraform.tfvars.example" ]; then
    warning "terraform.tfvars not found (copy from .example)"
  fi
  
  if [ -f "infrastructure/provider.tf" ]; then
    check_pass "Terraform provider configured"
  else
    check_fail "Terraform provider missing"
  fi
  
  if [ -f "infrastructure/main.tf" ]; then
    check_pass "Terraform infrastructure defined"
  else
    check_fail "Terraform main configuration missing"
  fi
  
  # Validate Terraform syntax
  if command -v terraform &> /dev/null; then
    if cd infrastructure && terraform validate > /dev/null 2>&1; then
      check_pass "Terraform configuration valid"
      cd ..
    else
      check_fail "Terraform configuration has errors"
      cd ..
    fi
  fi
  
  echo ""
fi

################################################################################
# Deployment Scripts
################################################################################

echo -e "${YELLOW}📝 Checking Deployment Scripts...${NC}"

# deploy.sh executable
if [ -x "scripts/deploy.sh" ]; then
  check_pass "deploy.sh is executable"
else
  check_fail "deploy.sh not executable (fix with: chmod +x scripts/deploy.sh)"
fi

# GitHub Actions workflow
if [ -f ".github/workflows/deploy.yml" ]; then
  check_pass "GitHub Actions workflow exists"
else
  check_fail "GitHub Actions workflow missing"
fi

echo ""

################################################################################
# Site Files
################################################################################

echo -e "${YELLOW}📦 Checking Site Files...${NC}"

# HTML files
for file in index.html input.html report.html; do
  if [ -f "site/$file" ]; then
    SIZE=$(wc -c < "site/$file" | awk '{print}')
    check_pass "site/$file exists ($SIZE bytes)"
  else
    check_critical "site/$file missing (critical)"
  fi
done

# CSS files
if [ -f "site/css/shared.css" ]; then
  check_pass "site/css/shared.css exists"
else
  check_fail "site/css/shared.css missing"
fi

# JS files
JS_COUNT=$(find site -name "*.js" | wc -l)
if [ "$JS_COUNT" -gt 5 ]; then
  check_pass "JavaScript files found ($JS_COUNT files)"
else
  check_fail "Not enough JavaScript files ($JS_COUNT found, expected > 5)"
fi

echo ""

################################################################################
# Summary
################################################################################

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Validation Summary                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "Total checks: $CHECKS_TOTAL"
echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
if [ "$CHECKS_FAILED" -gt 0 ]; then
  echo -e "${RED}Failed: $CHECKS_FAILED${NC}"
fi
if [ "$CHECKS_CRITICAL" -gt 0 ]; then
  echo -e "${RED}Critical: $CHECKS_CRITICAL${NC}"
fi

echo ""

################################################################################
# Exit Codes & Recommendations
################################################################################

if [ "$CHECKS_CRITICAL" -gt 0 ]; then
  echo -e "${RED}⚠ CRITICAL ISSUES FOUND - DO NOT DEPLOY${NC}"
  echo "Fix critical issues before proceeding."
  exit 2
elif [ "$CHECKS_FAILED" -gt 0 ]; then
  echo -e "${YELLOW}⚠ WARNINGS - Review before deploying${NC}"
  echo "Non-critical issues found. Review recommendations above."
  exit 1
else
  echo -e "${GREEN}✅ ALL CHECKS PASSED - READY TO DEPLOY${NC}"
  echo ""
  echo "Deployment commands:"
  echo "  npm run deploy                    # Manual deployment"
  echo "  git push origin main              # CI/CD deployment via GitHub Actions"
  exit 0
fi
