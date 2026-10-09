import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEgyptPhone, whatsappLink, telLink } from '../lib/phone/egypt.mjs';

const n = (...a) => normalizeEgyptPhone(...a);

test('local mobile 01XXXXXXXXX -> +201XXXXXXXXX, whatsapp eligible', () => {
  for (const p of ['01012345678', '01112345678', '01212345678', '01512345678']) {
    const r = n(p);
    assert.equal(r.phone_e164, '+20' + p.slice(1));
    assert.equal(r.phone_type, 'mobile');
    assert.equal(r.whatsapp_eligible, true);
  }
});

test('international formats from Google Maps', () => {
  assert.equal(n('+201211100024', '+20 12 11100024').phone_e164, '+201211100024');
  assert.equal(n('+20 10 20116617').phone_e164, '+201020116617');
  assert.equal(n('0020 10 2011 6617').phone_e164, '+201020116617');
  assert.equal(n('201020116617').phone_e164, '+201020116617');
  assert.equal(n('1020116617').phone_e164, '+201020116617');
});

test('arabic-indic digits', () => {
  assert.equal(n('٠١٠١٢٣٤٥٦٧٨').phone_e164, '+201012345678');
});

test('landlines are never whatsapp eligible', () => {
  for (const raw of ['+20221250000', '02 2125 0000', '(03) 4912345']) {
    const r = n(raw);
    assert.equal(r.phone_type, 'landline', raw);
    assert.equal(r.whatsapp_eligible, false, raw);
    assert.ok(r.phone_e164.startsWith('+20'));
  }
  assert.equal(n('+20221250000').phone_e164, '+20221250000');
});

test('non-eligible mobile prefixes and junk', () => {
  assert.equal(n('01612345678').whatsapp_eligible, false);
  assert.equal(n('').phone_e164, null);
  assert.equal(n(null, undefined).phone_type, 'unknown');
  assert.equal(n('abc').phone_e164, null);
});

test('falls back to the second candidate', () => {
  assert.equal(n('', '010 1234 5678').phone_e164, '+201012345678');
});

test('wa.me link uses digits only and encodes text', () => {
  assert.equal(whatsappLink('+201012345678', 'اهلا بيك'), 'https://wa.me/201012345678?text=%D8%A7%D9%87%D9%84%D8%A7%20%D8%A8%D9%8A%D9%83');
  assert.equal(whatsappLink('+201012345678'), 'https://wa.me/201012345678');
  assert.equal(whatsappLink(null, 'x'), null);
  assert.equal(telLink('+20221250000'), 'tel:+20221250000');
});
