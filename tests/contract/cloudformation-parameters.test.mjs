import { test, expect } from '@jest/globals';
import Ajv from 'ajv';
import * as fs from 'fs';

// Load parameter schema
const schema = JSON.parse(
  fs.readFileSync('specs/003-s3-subdomain-deployment/contracts/cloudformation-parameters.schema.json', 'utf-8')
);

const ajv = new Ajv();
const validateParameters = ajv.compile(schema);

test('Parameter schema validates valid parameters', () => {
  const validParams = {
    HostedZoneId: 'Z1234567890ABC',
    SubdomainName: 'alignment',
    ParentDomainName: 'example.com',
    CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
    Environment: 'production'
  };

  const valid = validateParameters(validParams);
  expect(valid).toBe(true);
});

test('Parameter schema rejects invalid HostedZoneId', () => {
  const invalidParams = {
    HostedZoneId: 'invalid-zone-id',
    SubdomainName: 'alignment',
    ParentDomainName: 'example.com',
    CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
  };

  const valid = validateParameters(invalidParams);
  expect(valid).toBe(false);
  expect(validateParameters.errors).toHaveLength(1);
});

test('Parameter schema rejects invalid SubdomainName', () => {
  const invalidParams = {
    HostedZoneId: 'Z1234567890ABC',
    SubdomainName: 'invalid_subdomain',
    ParentDomainName: 'example.com',
    CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
  };

  const valid = validateParameters(invalidParams);
  expect(valid).toBe(false);
});

test('Parameter schema rejects invalid ParentDomainName', () => {
  const invalidParams = {
    HostedZoneId: 'Z1234567890ABC',
    SubdomainName: 'alignment',
    ParentDomainName: 'invalid_domain',
    CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
  };

  const valid = validateParameters(invalidParams);
  expect(valid).toBe(false);
});

test('Parameter schema rejects invalid CertificateArn', () => {
  const invalidParams = {
    HostedZoneId: 'Z1234567890ABC',
    SubdomainName: 'alignment',
    ParentDomainName: 'example.com',
    CertificateArn: 'invalid-arn'
  };

  const valid = validateParameters(invalidParams);
  expect(valid).toBe(false);
});

test('Parameter schema allows default Environment (production)', () => {
  const params = {
    HostedZoneId: 'Z1234567890ABC',
    SubdomainName: 'alignment',
    ParentDomainName: 'example.com',
    CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
    // Environment omitted - should use default
  };

  const valid = validateParameters(params);
  expect(valid).toBe(true);
});

test('Parameter schema rejects invalid Environment value', () => {
  const invalidParams = {
    HostedZoneId: 'Z1234567890ABC',
    SubdomainName: 'alignment',
    ParentDomainName: 'example.com',
    CertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
    Environment: 'invalid-env'
  };

  const valid = validateParameters(invalidParams);
  expect(valid).toBe(false);
});

test('Parameter schema rejects missing required parameters', () => {
  const invalidParams = {
    HostedZoneId: 'Z1234567890ABC'
    // Missing SubdomainName, ParentDomainName, CertificateArn
  };

  const valid = validateParameters(invalidParams);
  expect(valid).toBe(false);
  expect(validateParameters.errors.length).toBeGreaterThan(0);
});
