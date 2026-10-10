// Loads an n8n Code-node source from n8n/code and inlines the shared plain-JS libraries (single source of truth).
// Markers: /*__PHONE__*/ -> lib/phone/egypt.mjs, /*__INSIGHTS__*/ -> lib/insights/core.mjs. Used by build.mjs and the tests.
import { readFileSync } from 'node:fs';

const lf = (t) => t.replace(/\r\n/g, '\n'); // identical output on Windows and Linux (CI checks for drift)
const lib = (rel) => lf(readFileSync(new URL(rel, import.meta.url), 'utf8')).replace(/^export /gm, '');

export function code(f, vars = {}) {
  let s = lf(readFileSync(new URL(`./code/${f}`, import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(vars)) s = s.split(k).join(String(v));
  if (s.includes('/*__PHONE__*/')) s = s.replace('/*__PHONE__*/', lib('../lib/phone/egypt.mjs'));
  if (s.includes('/*__INSIGHTS__*/')) s = s.replace('/*__INSIGHTS__*/', lib('../lib/insights/core.mjs'));
  return s;
}
