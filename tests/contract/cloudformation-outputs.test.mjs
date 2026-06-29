import { test, expect } from '@jest/globals';
import Ajv from 'ajv';
import * as fs from 'fs';

// Load output schema
const schema = JSON.parse(
  fs.readFileSync('specs/003-s3-subdomain-deployment/contracts/cloudformation-outputs.schema.json', 'utf-8')
);

const ajv = new Ajv();
const validateOutputs = ajv.compile(schema);

test('Output schema validates valid CloudFormation outputs', () => {
  const validOutputs = {
    AppBucketName: 'alignment-123456789012',
    CloudFrontDomainName: 'd123abc.cloudfront.net',
    DistributionId: 'E1234ABCD5678',
    DeployedUrl: 'alignment.example.com',
    StackStatus: 'CREATE_COMPLETE'
  };

  const valid = validateOutputs(validOutputs);
  expect(valid).toBe(true);
});

test('Output schema validates required outputs only', () => {
  const outputs = {
    AppBucketName: 'alignment-123456789012',
    CloudFrontDomainName: 'd123abc.cloudfront.net',
    DistributionId: 'E1234ABCD5678',
    DeployedUrl: 'alignment.example.com'
    // StackStatus optional
  };

  const valid = validateOutputs(outputs);
  expect(valid).toBe(true);
});

test('Output schema rejects invalid S3 bucket name', () => {
  const invalidOutputs = {
    AppBucketName: 'UPPERCASE-BUCKET-NAME',
    CloudFrontDomainName: 'd123abc.cloudfront.net',
    DistributionId: 'E1234ABCD5678',
    DeployedUrl: 'alignment.example.com'
  };

  const valid = validateOutputs(invalidOutputs);
  expect(valid).toBe(false);
});

test('Output schema rejects invalid CloudFront domain name', () => {
  const invalidOutputs = {
    AppBucketName: 'alignment-123456789012',
    CloudFrontDomainName: 'not-cloudfront-domain',
    DistributionId: 'E1234ABCD5678',
    DeployedUrl: 'alignment.example.com'
  };

  const valid = validateOutputs(invalidOutputs);
  expect(valid).toBe(false);
});

test('Output schema rejects invalid distribution ID', () => {
  const invalidOutputs = {
    AppBucketName: 'alignment-123456789012',
    CloudFrontDomainName: 'd123abc.cloudfront.net',
    DistributionId: 'INVALID-DIST-ID',
    DeployedUrl: 'alignment.example.com'
  };

  const valid = validateOutputs(invalidOutputs);
  expect(valid).toBe(false);
});

test('Output schema validates different valid domain names', () => {
  const validOutputs = {
    AppBucketName: 'alignment-123456789012',
    CloudFrontDomainName: 'd1234567890.cloudfront.net',
    DistributionId: 'EABC1234567',
    DeployedUrl: 'app.mydomain.co.uk'
  };

  const valid = validateOutputs(validOutputs);
  expect(valid).toBe(true);
});

test('Output schema rejects missing required outputs', () => {
  const invalidOutputs = {
    AppBucketName: 'alignment-123456789012'
    // Missing other required outputs
  };

  const valid = validateOutputs(invalidOutputs);
  expect(valid).toBe(false);
  expect(validateOutputs.errors.length).toBeGreaterThan(0);
});

test('Output schema validates all valid stack statuses', () => {
  const validStatuses = [
    'CREATE_IN_PROGRESS',
    'CREATE_COMPLETE',
    'UPDATE_IN_PROGRESS',
    'UPDATE_COMPLETE',
    'DELETE_IN_PROGRESS',
    'DELETE_COMPLETE'
  ];

  const baseOutputs = {
    AppBucketName: 'alignment-123456789012',
    CloudFrontDomainName: 'd123abc.cloudfront.net',
    DistributionId: 'E1234ABCD5678',
    DeployedUrl: 'alignment.example.com'
  };

  validStatuses.forEach(status => {
    const outputs = { ...baseOutputs, StackStatus: status };
    const valid = validateOutputs(outputs);
    expect(valid).toBe(true);
  });
});

test('Output schema rejects invalid stack status', () => {
  const invalidOutputs = {
    AppBucketName: 'alignment-123456789012',
    CloudFrontDomainName: 'd123abc.cloudfront.net',
    DistributionId: 'E1234ABCD5678',
    DeployedUrl: 'alignment.example.com',
    StackStatus: 'INVALID_STATUS'
  };

  const valid = validateOutputs(invalidOutputs);
  expect(valid).toBe(false);
});
