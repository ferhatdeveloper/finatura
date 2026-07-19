import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractLoginIdentifier,
  normalizeLoginIdentifier,
  normalizeTrPhoneDigits,
} from './loginIdentifier.js';

describe('loginIdentifier', () => {
  it('normalizes TR phone variants', () => {
    assert.equal(normalizeTrPhoneDigits('5551112233'), '5551112233');
    assert.equal(normalizeTrPhoneDigits('05551112233'), '5551112233');
    assert.equal(normalizeTrPhoneDigits('905551112233'), '5551112233');
  });

  it('classifies email', () => {
    const id = normalizeLoginIdentifier('Demo@Finatura.app');
    assert.equal(id.kind, 'email');
    assert.equal(id.email, 'demo@finatura.app');
    assert.equal(id.phoneDigits, null);
  });

  it('classifies tckn', () => {
    const id = normalizeLoginIdentifier('10000000146');
    assert.equal(id.kind, 'tckn');
    assert.equal(id.tckn, '10000000146');
  });

  it('classifies 10-digit vergi / phone', () => {
    const vergi = normalizeLoginIdentifier('1234567890');
    assert.equal(vergi.vergiNo, '1234567890');
    const phone = normalizeLoginIdentifier('0555 111 22 33');
    assert.equal(phone.phoneDigits, '5551112233');
  });

  it('extracts identifier from body aliases', () => {
    assert.equal(
      extractLoginIdentifier({ identifier: 'a@b.com' }),
      'a@b.com',
    );
    assert.equal(extractLoginIdentifier({ username: '555' }), '555');
    assert.equal(extractLoginIdentifier({ email: 'x@y.com' }), 'x@y.com');
  });
});
