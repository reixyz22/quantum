// Smoke test for the demo page, no browser needed.
//
// Loads web/data/demo.js, web/demo.js and web/layout.js against a small fake DOM, steps
// through every frame of every card, measures at the sweet spot, and fails if
// anything the page writes contains "undefined" or "NaN", or if any frame's
// numbers disagree with what the exporter promised.
//
//     node tools/check_demo.mjs
//     node tools/check_demo.mjs --narrate 15     print every frame's narration
import { readFileSync } from "node:fs";
import vm from "node:vm";

const written = [];

class El {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.nodeName = tag;
    this.childNodes = [];
    this.attrs = {};
    this.dataset = {};
    this.style = { setProperty() {} };
    this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
    this.parentElement = null;
    this.hidden = false;
    this.disabled = false;
    this._text = "";
    this._html = "";
    this._cls = "";
  }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  get children() { return this.childNodes; }
  get clientWidth() { return 900; }
  get offsetWidth() { return 120; }
  get offsetHeight() { return 40; }
  appendChild(c) { c.parentElement = this; this.childNodes.push(c); return c; }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); written.push(`${k}=${v}`); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  addEventListener() {}
  insertAdjacentHTML() {}
  closest() { return null; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 900, height: 400 }; }
  getComputedTextLength() { return 80; }
  set innerHTML(v) { this._html = String(v); this.childNodes = []; written.push(this._html); }
  get innerHTML() { return this._html; }
  set textContent(v) { this._text = String(v); written.push(this._text); }
  get textContent() { return this._text; }
  set className(v) { this._cls = v; }
  get className() { return this._cls; }
}

const byId = new Map();
const shared = new El();
const document = {
  body: new El("body"),
  getElementById(id) {
    if (!byId.has(id)) {
      const node = new El(id === "bars" || id === "curve" || id === "angle" ? "svg" : "div");
      node.parentElement = new El();
      byId.set(id, node);
    }
    return byId.get(id);
  },
  createElement: (t) => new El(t),
  createElementNS: (_, t) => new El(t),
  querySelector: () => shared,
  querySelectorAll: () => [],
  addEventListener() {},
};

const ctx = {
  document,
  localStorage: { getItem: () => null, setItem() {} },
  matchMedia: () => ({ matches: true }),        // reduced motion: tweens finish instantly
  addEventListener() {},
  requestAnimationFrame: (fn) => setImmediate(() => fn(performance.now())),
  cancelAnimationFrame() {},
  setTimeout: (fn) => { Promise.resolve().then(fn); return 0; },
  clearTimeout() {},
  performance,
  console,
  dispatchEvent() {},
  CustomEvent: class { constructor(type) { this.type = type; } },
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync("web/data/demo.js", "utf8"), ctx);
vm.runInContext(readFileSync("web/demo.js", "utf8"), ctx);
vm.runInContext(readFileSync("web/layout.js", "utf8"), ctx);

const demo = ctx.__groverDemo;

const flag = process.argv.indexOf("--narrate");
if (flag !== -1) {
  const target = Number(process.argv[flag + 1]);
  const card = demo.cards.find((c) => c.target === target);
  if (!card) { console.log("no card", target); process.exit(1); }
  demo.chooseCard(card);
  for (let f = 0; f < card.frames.length; f++) {
    const n = demo.narration.call(null, f);
    console.log(`[${String(f).padStart(2)}] ${n.title}`);
    console.log(`     ${n.body}`);
  }
  process.exit(0);
}

const problems = [];
const check = (cond, msg) => { if (!cond) problems.push(msg); };

for (const card of demo.cards) {
  demo.chooseCard(card);
  await demo.goTo(0, true);
  const last = card.frames.length - 1;
  check(last === 1 + 2 * card.rounds, `${card.target}: ${last + 1} frames for ${card.rounds} rounds`);

  for (let f = 1; f <= last; f++) {
    await demo.goTo(f);
    const n = demo.narration(f);
    check(n.title && n.body, `${card.target} frame ${f}: empty narration`);
    const it = demo.info(f);
    if (it.kind === "diffuse") {
      const w = card.frames[f][card.winner];
      check(Math.abs(w * w - card.chances[it.round]) < 1e-4,
        `${card.target} round ${it.round}: chance mismatch`);
    }
  }

  await demo.goTo(2 * card.best + 1, true);
  for (let shot = 0; shot < 40; shot++) demo.measure();
  check(demo.measured !== null, `${card.target}: measure produced nothing`);
}

const bad = written.filter((s) => /undefined|NaN/.test(s));
check(bad.length === 0, `wrote ${bad.length} strings containing undefined/NaN, e.g. ${bad.slice(0, 3).join(" | ")}`);

if (problems.length) {
  console.log("FAIL");
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
const frames = demo.cards.reduce((s, c) => s + c.frames.length, 0);
console.log(`ok: ${demo.cards.length} cards, ${frames} frames stepped, ${written.length} writes checked`);
