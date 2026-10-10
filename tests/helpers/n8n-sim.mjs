// Minimal simulator of the n8n Code-node runtime ($('Node'), $input, $prevNode ...) so the generated code can be tested offline.
import { code } from '../../n8n/inline.mjs';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const items = (arr) => (arr || []).map((j) => ({ json: j }));

/**
 * @param {string} file name in n8n/code
 * @param {{nodes?: Record<string, any[]>, input?: any[], prev?: string, vars?: Record<string,string>, itemIndex?: number}} ctx
 *   nodes: output items (plain json objects) of the nodes the code reads with $('Name')
 */
export async function runNode(file, ctx = {}) {
  const { nodes = {}, input = [], prev = 'Prev', vars = {}, itemIndex = 0 } = ctx;
  const src = code(file, vars);
  const mk = (name) => {
    const list = items(nodes[name] || []);
    return { first: () => list[0], last: () => list[list.length - 1], all: () => list, item: list[itemIndex] };
  };
  const $ = (name) => {
    if (!(name in nodes)) throw new Error(`Node "${name}" did not run`);
    return mk(name);
  };
  const inp = items(input);
  const $input = { all: () => inp, first: () => inp[0], item: inp[itemIndex] };
  const fn = new AsyncFunction('$', '$input', '$prevNode', '$runIndex', src);
  return fn($, $input, { name: prev }, 0);
}

/** Compile-only check (syntax) of a code string as an n8n Code node. */
export function compiles(jsCode) {
  new AsyncFunction('$', '$input', '$prevNode', '$runIndex', jsCode);
  return true;
}
