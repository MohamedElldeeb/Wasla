// Server action errors: classification, field naming, and the reference id written to the log (no personal data).
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDbError, firstInvalidField, logActionError, newErrorRef } from '../lib/action-errors.mjs';

test('database errors are classified so the UI can explain them', () => {
  assert.equal(classifyDbError('insufficient_credits'), 'insufficient_credits');
  assert.equal(classifyDbError('org_suspended'), 'org_suspended');
  assert.equal(classifyDbError('campaign_not_found'), 'campaign_not_found');
  assert.equal(classifyDbError('invalid_credits'), 'invalid_credits');
  assert.equal(classifyDbError('new row violates row-level security policy for table "campaigns"'), 'forbidden');
  assert.equal(classifyDbError('forbidden'), 'forbidden');
  assert.equal(classifyDbError('JWT expired'), 'session');
  assert.equal(classifyDbError('contact_cooldown'), 'contact_cooldown');
  assert.equal(classifyDbError('something nobody mapped'), 'unknown');
  assert.equal(classifyDbError(undefined), 'unknown');
});

test('the first invalid field of a validation error is named', () => {
  assert.deepEqual(firstInvalidField({ issues: [{ path: ['signals', 2, 'weight'], message: 'Too big' }] }), { field: 'signals', issue: 'Too big' });
  assert.deepEqual(firstInvalidField({ issues: [{ path: [], message: 'Invalid input' }] }), { field: '', issue: 'Invalid input' });
  assert.deepEqual(firstInvalidField({ issues: [] }), { field: '', issue: '' });
});

test('logActionError returns a reference and logs one structured line with the technical cause', () => {
  const lines = [];
  const orig = console.error;
  console.error = (l) => lines.push(l);
  try {
    const ref = logActionError('saveCampaign:insert', 'duplicate key value violates unique constraint', { org: 'o1' });
    assert.match(ref, /^[A-Z0-9]{4,6}$/);
    const j = JSON.parse(lines[0]);
    assert.equal(j.tag, 'wasla-action-error');
    assert.equal(j.ref, ref);
    assert.equal(j.action, 'saveCampaign:insert');
    assert.equal(j.org, 'o1');
    assert.match(j.cause, /unique constraint/);
    assert.equal(logActionError('x', new Error('boom')) === ref, false, 'every error gets its own reference');
  } finally {
    console.error = orig;
  }
  assert.match(newErrorRef(), /^[A-Z0-9]+$/);
});
