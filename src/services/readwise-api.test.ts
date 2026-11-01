/// <reference types="jest" />
import {
  canonicalizeApiBaseUrl,
  isCleartextRemoteUrl,
  isTokenOptional,
  isValidApiBaseUrl,
  normalizeApiBaseUrl,
} from 'services/readwise-api';
import { READWISE_API_BASE_URL } from '../constants';

describe('canonicalizeApiBaseUrl', () => {
  it('strips trailing slashes and surrounding whitespace', () => {
    expect(canonicalizeApiBaseUrl('  https://proxy.example/api/v2//  ')).toBe('https://proxy.example/api/v2');
  });

  it.each([
    'https:proxy.example/api/v2',
    'https:/proxy.example/api/v2',
    'https://proxy.example/api/v2?key=abc',
    'https://proxy.example/api/v2#frag',
    'ftp://proxy.example/api/v2',
    'readwise.io/api/v2',
    'https://',
    '',
    '   ',
  ])('rejects %p', (value) => {
    expect(canonicalizeApiBaseUrl(value)).toBeNull();
    expect(isValidApiBaseUrl(value)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(canonicalizeApiBaseUrl(42)).toBeNull();
    expect(canonicalizeApiBaseUrl(null)).toBeNull();
    expect(canonicalizeApiBaseUrl(undefined)).toBeNull();
  });
});

describe('normalizeApiBaseUrl', () => {
  it('returns the default for empty, invalid or non-string values', () => {
    expect(normalizeApiBaseUrl('')).toBe(READWISE_API_BASE_URL);
    expect(normalizeApiBaseUrl(null)).toBe(READWISE_API_BASE_URL);
    expect(normalizeApiBaseUrl('readwise.io/api/v2')).toBe(READWISE_API_BASE_URL);
    expect(normalizeApiBaseUrl(42)).toBe(READWISE_API_BASE_URL);
  });

  it('returns the canonical form of a valid URL', () => {
    expect(normalizeApiBaseUrl('http://localhost:8080/api/v2/')).toBe('http://localhost:8080/api/v2');
  });
});

describe('isCleartextRemoteUrl', () => {
  it('flags plain http to non-loopback hosts only', () => {
    expect(isCleartextRemoteUrl('http://proxy.example/api/v2')).toBe(true);
    expect(isCleartextRemoteUrl('http://localhost:8080/api/v2')).toBe(false);
    expect(isCleartextRemoteUrl('http://127.0.0.1/api/v2')).toBe(false);
    expect(isCleartextRemoteUrl('http://[::1]/api/v2')).toBe(false);
    expect(isCleartextRemoteUrl('https://proxy.example/api/v2')).toBe(false);
  });
});

describe('isTokenOptional', () => {
  it('is honoured only for a custom API URL', () => {
    expect(isTokenOptional({ apiBaseUrl: 'https://proxy.example/api/v2', apiTokenOptional: true })).toBe(true);
    expect(isTokenOptional({ apiBaseUrl: READWISE_API_BASE_URL, apiTokenOptional: true })).toBe(false);
    expect(isTokenOptional({ apiBaseUrl: '', apiTokenOptional: true })).toBe(false);
    expect(isTokenOptional({ apiBaseUrl: 'https://proxy.example/api/v2', apiTokenOptional: false })).toBe(false);
  });
});
