// Drag, resize and lock the demo's panels, so the layout can be arranged to
// fit whatever screen it's being presented on. Saved per device.
//
// The default is the normal flowing page. Pressing Arrange measures where
// every panel currently sits and pins them there, so editing starts from what
// is already on screen rather than from a blank canvas. Horizontal position
// and width are stored as fractions of the board, so a saved layout still
// fits if the window changes width.
(function () {
  "use strict";

  const KEY = "q-demo-layout-v1";
  const SNAP = 8;
  const MIN_W = 180;
  const MIN_H = 90;

  const board = document.getElementById("board");
  const toggle = document.getElementById("layout-toggle");
  const resetButton = document.getElementById("layout-reset");

  // Arrange is an authoring tool, not something a visitor needs. ?arrange=1 brings it back.
  const authoring = String((typeof location === "object" && location.search) || "").indexOf("arrange") > -1;
  if (authoring && toggle) toggle.hidden = false;
  const hint = document.getElementById("arrange-hint");
  if (!board || !toggle) return;

  const panels = () => Array.from(board.querySelectorAll("[data-panel]"));
  const snap = (v) => Math.round(v / SNAP) * SNAP;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  let editing = false;
  let topZ = 10;

  function load() {
    // A layout saved while authoring must never decide what a visitor sees, so it
    // only applies in authoring mode. Add ?arrange=1 to get a saved layout back.
    if (!authoring) return null;
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  }
  function store(layout) {
    try { localStorage.setItem(KEY, JSON.stringify(layout)); } catch (e) { /* private mode */ }
  }
  function forget() {
    try { localStorage.removeItem(KEY); } catch (e) { /* private mode */ }
  }

  // Where every panel is right now, relative to the board.
  function measure() {
    const b = board.getBoundingClientRect();
    const layout = {};
    panels().forEach((p) => {
      const r = p.getBoundingClientRect();
      layout[p.dataset.panel] = {
        x: (r.left - b.left) / b.width,
        y: Math.round(r.top - b.top),
        w: r.width / b.width,
        h: Math.round(r.height),
        z: 1,
      };
    });
    return layout;
  }

  function fitBoard() {
    let bottom = 0;
    panels().forEach((p) => { bottom = Math.max(bottom, p.offsetTop + p.offsetHeight); });
    board.style.height = Math.ceil(bottom + 32) + "px";
  }

  function apply(layout) {
    board.classList.add("custom");
    const W = board.clientWidth;
    let bottom = 0;
    const missing = [];
    panels().forEach((p) => {
      const spot = layout[p.dataset.panel];
      if (!spot) { missing.push(p); return; }
      p.style.left = Math.round(spot.x * W) + "px";
      p.style.top = spot.y + "px";
      p.style.width = Math.round(spot.w * W) + "px";
      p.style.height = spot.h + "px";
      p.style.zIndex = spot.z || 1;
      topZ = Math.max(topZ, spot.z || 1);
      bottom = Math.max(bottom, spot.y + spot.h);
    });
    // A panel added after this layout was saved goes underneath everything.
    missing.forEach((p) => {
      p.style.left = "0px";
      p.style.top = Math.round(bottom + 16) + "px";
      p.style.width = W + "px";
      p.style.height = "auto";
      bottom += p.offsetHeight + 16;
    });
    fitBoard();
    notify();
  }

  function persist() {
    const W = board.clientWidth;
    const layout = {};
    panels().forEach((p) => {
      layout[p.dataset.panel] = {
        x: p.offsetLeft / W,
        y: p.offsetTop,
        w: p.offsetWidth / W,
        h: p.offsetHeight,
        z: parseInt(p.style.zIndex, 10) || 1,
      };
    });
    store(layout);
  }

  function release() {
    board.classList.remove("custom");
    board.style.height = "";
    panels().forEach((p) => {
      ["left", "top", "width", "height", "zIndex"].forEach((k) => { p.style[k] = ""; });
    });
    notify();
  }

  // Charts re-measure themselves when their box changes size; this nudges them
  // when the whole layout switches mode at once.
  function notify() {
    window.dispatchEvent(new CustomEvent("demo-layout"));
  }

  // ------------------------------------------------------------ edit chrome

  function addChrome(p) {
    if (p.querySelector(":scope > .chrome")) return;
    const chrome = document.createElement("div");
    chrome.className = "chrome";
    chrome.innerHTML =
      `<div class="grab" title="Drag to move">⠿ <span>${p.dataset.title || p.dataset.panel}</span></div>` +
      `<div class="grip" title="Drag to resize" aria-hidden="true"></div>`;
    p.appendChild(chrome);
    chrome.querySelector(".grab").addEventListener("pointerdown", (e) => begin(p, e, "move"));
    chrome.querySelector(".grip").addEventListener("pointerdown", (e) => begin(p, e, "size"));
  }
  function removeChrome(p) {
    const chrome = p.querySelector(":scope > .chrome");
    if (chrome) chrome.remove();
  }

  function begin(p, e, mode) {
    if (!editing || e.button !== 0) return;
    e.preventDefault();
    const start = {
      x: e.clientX, y: e.clientY,
      left: p.offsetLeft, top: p.offsetTop,
      w: p.offsetWidth, h: p.offsetHeight,
    };
    p.style.zIndex = ++topZ;
    p.classList.add("moving");

    const move = (ev) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      const W = board.clientWidth;
      if (mode === "move") {
        p.style.left = snap(clamp(start.left + dx, 0, W - start.w)) + "px";
        p.style.top = snap(Math.max(0, start.top + dy)) + "px";
      } else {
        p.style.width = snap(clamp(start.w + dx, MIN_W, W - start.left)) + "px";
        p.style.height = snap(Math.max(MIN_H, start.h + dy)) + "px";
      }
      fitBoard();
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      p.classList.remove("moving");
      persist();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  // ------------------------------------------------------------- the modes

  function startEditing() {
    if (!board.classList.contains("custom")) apply(load() || measure());
    editing = true;
    board.classList.add("editing");
    panels().forEach(addChrome);
    paint();
  }

  function lock() {
    editing = false;
    board.classList.remove("editing");
    panels().forEach(removeChrome);
    persist();
    paint();
  }

  function reset() {
    forget();
    editing = false;
    board.classList.remove("editing");
    panels().forEach(removeChrome);
    release();
    paint();
  }

  function paint() {
    toggle.textContent = editing ? "🔒 Lock layout" : "✥ Arrange";
    toggle.setAttribute("aria-pressed", editing ? "true" : "false");
    resetButton.hidden = !(editing || board.classList.contains("custom"));
    hint.hidden = !editing;
  }

  toggle.addEventListener("click", () => (editing ? lock() : startEditing()));
  resetButton.addEventListener("click", reset);

  let pending = 0;
  window.addEventListener("resize", () => {
    if (!board.classList.contains("custom")) return;
    clearTimeout(pending);
    pending = setTimeout(() => { const saved = load(); if (saved) apply(saved); }, 120);
  });

  // A saved layout is restored on load, already locked.
  const saved = load();
  if (saved && window.matchMedia("(min-width: 900px)").matches) apply(saved);
  paint();
})();
