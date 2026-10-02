// Grover demo. Every amplitude drawn here comes from window.DEMO, which
// tools/export_demo.py writes from Cirq's own state vectors. This file only
// draws and narrates; it never computes the quantum state itself.
(function () {
  "use strict";

  const DATA = window.DEMO;
  if (!DATA || !DATA.cards) {
    document.body.insertAdjacentHTML("afterbegin",
      "<p style='padding:1rem'>Demo data is missing. Run python tools/export_demo.py.</p>");
    return;
  }

  // ---------------------------------------------------------------- helpers

  const $ = (id) => document.getElementById(id);
  const SVG = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, attrs, parent) {
    const node = document.createElementNS(SVG, tag);
    for (const k in attrs || {}) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const customLayout = () => document.getElementById("board").classList.contains("custom");
  const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const r2 = (v) => Math.round(v * 100) / 100;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));

  function amp(v) {
    if (Math.abs(v) < 0.0005) return "0.000";
    return (v < 0 ? "−" : "") + Math.abs(v).toFixed(3);
  }
  function pct(p) {
    if (p >= 0.9995) return ">99.9%";
    if (p > 0 && p < 0.001) return "<0.1%";
    return (p * 100).toFixed(1) + "%";
  }
  const bitsOf = (label, n) => label.toString(2).padStart(n, "0");
  const degOf = (rad) => (rad * 180 / Math.PI).toFixed(1);
  function mean(list) {
    let s = 0;
    for (const v of list) s += v;
    return s / list.length;
  }

  // ------------------------------------------------------------------ state

  let card = DATA.cards.find((c) => c.target === 15) || DATA.cards[0];
  let frame = 0;
  let drawn = card.frames[0].slice();   // what is on screen right now
  let playing = false;
  let speed = 1;
  let anim = null;
  let measured = null;                  // { label, a, b, ok } for the current run
  const solved = new Set();

  // frames: 0 start, 1 after H, then oracle/diffuse pairs.
  // oracle of round r is frame 2r, diffuse of round r is frame 2r + 1.
  function info(f) {
    if (f === 0) return { kind: "start", round: 0 };
    if (f === 1) return { kind: "spread", round: 0 };
    return { kind: f % 2 === 0 ? "oracle" : "diffuse", round: Math.floor(f / 2) };
  }
  const bestFrame = () => 2 * card.best + 1;
  const lastFrame = () => card.frames.length - 1;
  const chanceOf = (amps) => amps[card.winner] * amps[card.winner];
  const roundsShown = (f) => (f >= 1 ? Math.floor((f - 1) / 2) : -1);

  function split(label) {
    const b = label & ((1 << card.bBits) - 1);
    const a = label >> card.bBits;
    return [a, b];
  }

  // ------------------------------------------------------------------ sound

  const Sound = (function () {
    let ctx = null;
    let on = true;
    try { on = localStorage.getItem("q-sound") !== "off"; } catch (e) { /* private mode */ }

    function audio() {
      if (!on) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    function noise(c, seconds) {
      const length = Math.max(1, Math.floor(c.sampleRate * seconds));
      const buffer = c.createBuffer(1, length, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    // The diffuser: a soft rising whoosh, timed to the reflection.
    function whoosh(seconds) {
      const c = audio();
      if (!c) return;
      const dur = clamp(seconds, 0.3, 1.2);
      const t = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = noise(c, dur);
      const band = c.createBiquadFilter();
      band.type = "bandpass";
      band.Q.value = 0.8;
      band.frequency.setValueAtTime(320, t);
      band.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.55);
      band.frequency.exponentialRampToValueAtTime(900, t + dur);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + dur * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(band).connect(gain).connect(c.destination);
      src.start(t);
      src.stop(t + dur);
    }

    // The oracle: a barely-there low tick as the sign flips.
    function tick() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.09);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    }

    // A correct measurement: two notes a fifth apart.
    function chime() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      [659.25, 987.77].forEach((freq, i) => {
        const osc = c.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const gain = c.createGain();
        const start = t + i * 0.11;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.09, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
        osc.connect(gain).connect(c.destination);
        osc.start(start);
        osc.stop(start + 0.95);
      });
    }

    // Picking a card: a short papery flick.
    function flick() {
      const c = audio();
      if (!c) return;
      const t = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = noise(c, 0.06);
      const high = c.createBiquadFilter();
      high.type = "highpass";
      high.frequency.value = 2600;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      src.connect(high).connect(gain).connect(c.destination);
      src.start(t);
      src.stop(t + 0.07);
    }

    function setOn(value) {
      on = value;
      try { localStorage.setItem("q-sound", on ? "on" : "off"); } catch (e) { /* private mode */ }
    }

    return { whoosh, tick, chime, flick, setOn, get on() { return on; } };
  })();

  // --------------------------------------------------------------- the hand

  function renderHand() {
    const hand = $("hand");
    hand.innerHTML = "";
    const mid = (DATA.cards.length - 1) / 2;

    DATA.cards.forEach((c, i) => {
      const isSolved = solved.has(c.target);
      const button = document.createElement("button");
      button.className = "pcard" + (isSolved ? " solved" : "");
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", c === card ? "true" : "false");
      button.setAttribute("aria-label",
        `Factor ${c.target}: ${c.n} qubits, ${c.N} labels` + (isSolved ? `, solved, ${c.a} times ${c.b}` : ""));
      button.style.setProperty("--rot", ((i - mid) * 6) + "deg");
      button.style.setProperty("--arc", (Math.abs(i - mid) * 8) + "px");
      button.innerHTML =
        `<span class="pc-corner tl">${c.target}</span>` +
        `<span class="pc-face">` +
          `<span class="pc-num">${c.target}</span>` +
          `<span class="pc-factors">${isSolved ? `${c.a} × ${c.b}` : "? × ?"}</span>` +
        `</span>` +
        `<span class="pc-meta">${c.n} qubits · ${c.N} labels</span>` +
        `<span class="pc-corner br">|ψ⟩</span>`;
      button.addEventListener("click", () => chooseCard(c));
      hand.appendChild(button);
    });
  }

  function chooseCard(c) {
    if (c === card) return;
    stop();
    if (anim) anim.cancel();
    card = c;
    frame = 0;
    drawn = card.frames[0].slice();
    measured = null;
    Sound.flick();
    renderHand();
    rebuild();
  }

  // --------------------------------------------------------------- bar chart

  const bars = {};

  function buildBars() {
    const svg = $("bars");
    const desc = svg.querySelector("desc");
    clear(svg);
    if (desc) svg.appendChild(desc);

    const box = svg.parentElement;
    const W = Math.max(320, Math.round(box.clientWidth));
    const small = W < 640;
    const N = card.N;
    const labelRow = N <= 16 ? 26 : (N <= 32 && !small ? 50 : 0);
    const M = { l: small ? 44 : 56, r: 12, t: 46, b: 16 + labelRow };
    const H = customLayout() ? Math.max(200, Math.round(box.clientHeight)) : (small ? 185 : 210);
    const PW = W - M.l - M.r;
    const PH = H - M.t - M.b;
    const y = (a) => M.t + (1 - a) / 2 * PH;
    const slot = PW / N;
    const gap = slot >= 10 ? 2 : slot >= 5 ? 1 : 0.6;
    const bw = Math.min(24, slot - gap);

    Object.assign(bars, { svg, W, H, M, PW, PH, y, y0: y(0), slot, bw, small });
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    const grid = el("g", {}, svg);
    [1, 0.5, 0, -0.5, -1].forEach((t) => {
      el("line", { x1: M.l, x2: W - M.r, y1: r2(y(t)), y2: r2(y(t)), class: t === 0 ? "zero" : "grid" }, grid);
      const label = el("text", { x: M.l - 10, y: r2(y(t) + 4), "text-anchor": "end", class: "tick" }, grid);
      label.textContent = t === 0 ? "0" : (t < 0 ? "−" : "") + Math.abs(t);
    });
    const title = el("text", {
      class: "axis-title",
      transform: `translate(${small ? 11 : 14},${r2(M.t + PH / 2)}) rotate(-90)`,
      "text-anchor": "middle",
    }, grid);
    title.textContent = "amplitude";

    bars.hover = el("rect", { class: "hover-col", y: M.t, height: PH, width: r2(slot), visibility: "hidden" }, svg);
    bars.glow = el("path", { class: "bar-glow" }, svg);

    const group = el("g", {}, svg);
    bars.paths = [];
    for (let i = 0; i < N; i++) {
      bars.paths.push(el("path", { class: "bar" + (i === card.winner ? " win" : "") }, group));
    }

    if (labelRow > 0) {
      for (let i = 0; i < N; i++) {
        const cx = M.l + i * slot + slot / 2;
        const t = el("text", { class: "xlabel" + (i === card.winner ? " win" : "") }, svg);
        if (N <= 16) {
          t.setAttribute("x", r2(cx));
          t.setAttribute("y", H - M.b + 18);
          t.setAttribute("text-anchor", "middle");
        } else {
          t.setAttribute("transform", `translate(${r2(cx + 3.5)},${H - M.b + 8}) rotate(-90)`);
          t.setAttribute("text-anchor", "end");
        }
        t.textContent = bitsOf(i, card.n);
      }
    }

    bars.avgG = el("g", { class: "avg-group", opacity: 0 }, svg);
    bars.avgLine = el("line", { x1: M.l, x2: W - M.r, class: "avg-line" }, bars.avgG);
    bars.avgChip = el("rect", { rx: 6, height: 22, class: "avg-chip" }, bars.avgG);
    bars.avgText = el("text", { class: "avg-label" }, bars.avgG);

    bars.callG = el("g", {}, svg);
    bars.callLead = el("line", { class: "zero" }, bars.callG);
    bars.callDot = el("circle", { r: 4.5, class: "callout-dot" }, bars.callG);
    bars.callText = el("text", { class: "callout" }, bars.callG);
  }

  function barPath(x, w, a) {
    const top = bars.y(a);
    const base = bars.y0;
    const h = Math.abs(top - base);
    if (h < 0.35) return "";
    const r = Math.min(4, w / 2, h);
    const X = r2(x), X2 = r2(x + w), T = r2(top), B = r2(base);
    if (a >= 0) {
      return `M${X},${B}V${r2(top + r)}Q${X},${T} ${r2(x + r)},${T}H${r2(x + w - r)}Q${X2},${T} ${X2},${r2(top + r)}V${B}Z`;
    }
    return `M${X},${B}V${r2(top - r)}Q${X},${T} ${r2(x + r)},${T}H${r2(x + w - r)}Q${X2},${T} ${X2},${r2(top - r)}V${B}Z`;
  }

  function drawBars(amps) {
    const { M, slot, bw } = bars;
    for (let i = 0; i < amps.length; i++) {
      bars.paths[i].setAttribute("d", barPath(M.l + i * slot + (slot - bw) / 2, bw, amps[i]));
    }
    const w = card.winner;
    bars.glow.setAttribute("d", bars.paths[w].getAttribute("d"));
    bars.glow.setAttribute("opacity", (0.06 + 0.6 * chanceOf(amps)).toFixed(3));
    placeCallout(amps);
  }

  // A label pinned in the top margin with a leader down to the answer's bar,
  // so it never sits on top of other bars.
  function placeCallout(amps) {
    const { M, slot, y, W, y0 } = bars;
    const cx = M.l + card.winner * slot + slot / 2;
    const v = amps[card.winner];
    const reach = v >= 0 ? y(v) : y0;
    const textY = 18;
    const dotY = 28;
    const text = solved.has(card.target)
      ? `the answer · ${card.winnerBits} = ${card.a} × ${card.b}`
      : `the answer · ${card.winnerBits}`;
    bars.callText.textContent = text;
    const width = text.length * 6.6;
    const right = cx + width / 2 < W - M.r;
    const anchor = right ? "middle" : "end";
    const tx = right ? clamp(cx, M.l + width / 2, W - M.r - width / 2) : W - M.r;
    bars.callText.setAttribute("x", r2(tx));
    bars.callText.setAttribute("y", textY);
    bars.callText.setAttribute("text-anchor", anchor);
    bars.callDot.setAttribute("cx", r2(cx));
    bars.callDot.setAttribute("cy", dotY);
    bars.callLead.setAttribute("x1", r2(cx));
    bars.callLead.setAttribute("x2", r2(cx));
    bars.callLead.setAttribute("y1", dotY);
    bars.callLead.setAttribute("y2", r2(Math.max(dotY, reach - 3)));
  }

  function drawAverage(m) {
    const { y, M } = bars;
    const yy = r2(y(m));
    bars.avgLine.setAttribute("y1", yy);
    bars.avgLine.setAttribute("y2", yy);
    bars.avgText.textContent = `average ${amp(m)}`;
    let width = 90;
    try { width = bars.avgText.getComputedTextLength() || width; } catch (e) { /* not laid out */ }
    const x = M.l + 8;
    bars.avgChip.setAttribute("x", x);
    bars.avgChip.setAttribute("y", yy - 11);
    bars.avgChip.setAttribute("width", r2(width + 14));
    bars.avgText.setAttribute("x", x + 7);
    bars.avgText.setAttribute("y", yy + 4);
  }
  function showAverage(visible) { bars.avgG.setAttribute("opacity", visible ? 1 : 0); }

  // hover tooltip
  function wireBarHover() {
    const svg = $("bars");
    const tip = $("bar-tip");
    svg.addEventListener("mousemove", (e) => {
      const rect = svg.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width * bars.W;
      const i = Math.floor((px - bars.M.l) / bars.slot);
      if (i < 0 || i >= card.N) { hideTip(); return; }
      const v = drawn[i];
      const [a, b] = split(i);
      bars.hover.setAttribute("x", r2(bars.M.l + i * bars.slot));
      bars.hover.setAttribute("visibility", "visible");
      tip.innerHTML =
        `<b>${bitsOf(i, card.n)}</b> <span style="color:var(--muted)">state[${i}]</span>` +
        `<div class="row"><span>a, b</span><span>${a}, ${b}</span></div>` +
        `<div class="row"><span>amplitude</span><span>${amp(v)}</span></div>` +
        `<div class="row"><span>chance</span><span>${pct(v * v)}</span></div>` +
        (i === card.winner ? `<div class="answer">the answer</div>` : "");
      tip.hidden = false;
      const box = svg.parentElement.getBoundingClientRect();
      const left = clamp(e.clientX - box.left + 14, 0, box.width - tip.offsetWidth);
      tip.style.left = left + "px";
      tip.style.top = clamp(e.clientY - box.top - tip.offsetHeight - 10, 0, box.height) + "px";
    });
    svg.addEventListener("mouseleave", hideTip);
    function hideTip() {
      tip.hidden = true;
      if (bars.hover) bars.hover.setAttribute("visibility", "hidden");
    }
  }

  // ---------------------------------------------------------- chance curve

  const curve = {};

  function buildCurve() {
    const svg = $("curve");
    if (!svg) return;
    clear(svg);
    const box = svg.parentElement;
    const W = Math.max(260, Math.round(box.clientWidth));
    const H = customLayout() ? Math.max(140, Math.round(box.clientHeight)) : 220;
    const M = { l: 44, r: 16, t: 18, b: 34 };
    const PW = W - M.l - M.r;
    const PH = H - M.t - M.b;
    const x = (r) => M.l + r / card.rounds * PW;
    const y = (p) => M.t + (1 - p) * PH;
    Object.assign(curve, { svg, W, H, M, PW, PH, x, y });
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    const grid = el("g", {}, svg);
    [0, 0.5, 1].forEach((p) => {
      el("line", { x1: M.l, x2: W - M.r, y1: r2(y(p)), y2: r2(y(p)), class: p === 0 ? "zero" : "grid" }, grid);
      const t = el("text", { x: M.l - 8, y: r2(y(p) + 4), "text-anchor": "end", class: "tick" }, grid);
      t.textContent = Math.round(p * 100) + "%";
    });
    const step = card.rounds <= 10 ? 1 : card.rounds <= 20 ? 2 : 5;
    for (let r = 0; r <= card.rounds; r += step) {
      const t = el("text", { x: r2(x(r)), y: H - M.b + 16, "text-anchor": "middle", class: "tick" }, grid);
      t.textContent = r;
    }
    const title = el("text", { x: W - M.r, y: H - 4, "text-anchor": "end", class: "axis-title" }, grid);
    title.textContent = "round";

    const sx = r2(x(card.best));
    el("line", { x1: sx, x2: sx, y1: M.t, y2: H - M.b, class: "stop-line" }, svg);
    const stopLabel = el("text", {
      x: sx + (card.best / card.rounds < 0.6 ? 6 : -6), y: M.t + 12,
      "text-anchor": card.best / card.rounds < 0.6 ? "start" : "end", class: "stop-label",
    }, svg);
    stopLabel.textContent = `planned stop: ${card.best}`;

    curve.area = el("path", { class: "curve-area" }, svg);
    curve.line = el("path", { class: "curve-line" }, svg);
    curve.dots = el("g", {}, svg);
    curve.cross = el("line", { class: "crosshair", y1: M.t, y2: H - M.b, visibility: "hidden" }, svg);
  }

  function drawCurve() {
    if (!curve.svg) return;
    const done = roundsShown(frame);
    const { x, y, M, H } = curve;
    while (curve.dots.firstChild) curve.dots.removeChild(curve.dots.firstChild);
    if (done < 0) {
      curve.line.setAttribute("d", "");
      curve.area.setAttribute("d", "");
      return;
    }
    let line = "";
    for (let r = 0; r <= done; r++) {
      line += (r === 0 ? "M" : "L") + r2(x(r)) + "," + r2(y(card.chances[r]));
    }
    curve.line.setAttribute("d", line);
    curve.area.setAttribute("d", line + `L${r2(x(done))},${H - M.b}L${r2(x(0))},${H - M.b}Z`);
    for (let r = 0; r <= done; r++) {
      el("circle", {
        cx: r2(x(r)), cy: r2(y(card.chances[r])),
        r: r === done ? 6 : 4, class: "curve-dot",
      }, curve.dots);
    }
  }

  function wireCurveHover() {
    const svg = $("curve");
    const tip = $("curve-tip");
    if (!svg || !tip) return;
    svg.addEventListener("mousemove", (e) => {
      const done = roundsShown(frame);
      if (done < 0) return;
      const rect = svg.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width * curve.W;
      const r = clamp(Math.round((px - curve.M.l) / curve.PW * card.rounds), 0, done);
      const cx = r2(curve.x(r));
      curve.cross.setAttribute("x1", cx);
      curve.cross.setAttribute("x2", cx);
      curve.cross.setAttribute("visibility", "visible");
      tip.innerHTML = `<div class="row"><span>round ${r}</span><span>${pct(card.chances[r])}</span></div>`;
      tip.hidden = false;
      const box = svg.parentElement.getBoundingClientRect();
      tip.style.left = clamp(cx / curve.W * box.width + 10, 0, box.width - tip.offsetWidth) + "px";
      tip.style.top = "4px";
    });
    svg.addEventListener("mouseleave", () => {
      tip.hidden = true;
      curve.cross.setAttribute("visibility", "hidden");
    });
  }

  // ------------------------------------------------------------ angle view

  const angle = {};

  function buildAngle() {
    const svg = $("angle");
    clear(svg);
    const S = 260;
    const c = S / 2;
    const R = 92;
    Object.assign(angle, { svg, S, c, R });
    svg.setAttribute("viewBox", `0 0 ${S} ${S}`);

    el("circle", { cx: c, cy: c, r: R, class: "ring" }, svg);
    el("line", { x1: c - R - 8, x2: c + R + 8, y1: c, y2: c, class: "zero" }, svg);
    el("line", { x1: c, x2: c, y1: c - R - 8, y2: c + R + 8, class: "zero" }, svg);

    const right = el("text", { x: c + R + 4, y: c + 16, "text-anchor": "end", class: "angle-label" }, svg);
    right.textContent = "everything else";
    const top = el("text", { x: c + 6, y: c - R - 2, class: "angle-label" }, svg);
    top.textContent = "the answer";

    const t = card.theta;
    el("line", {
      x1: c, y1: c, x2: r2(c + (R + 6) * Math.cos(t)), y2: r2(c - (R + 6) * Math.sin(t)), class: "ref-ray",
    }, svg);

    angle.arc = el("path", { class: "arc" }, svg);
    angle.arrow = el("line", { x1: c, y1: c, class: "arrow" }, svg);
    angle.head = el("path", { class: "arrow-head" }, svg);
    angle.value = el("text", { x: c, y: S - 4, "text-anchor": "middle", class: "angle-value" }, svg);
    angle.g = svg;
  }

  function stateAngle(amps) {
    const w = amps[card.winner];
    // every label other than the answer carries the same amplitude once H has
    // run, so any one of them stands for "everything else"
    const other = card.winner === 1 ? 2 : 1;
    const rest = amps[other] * Math.sqrt(card.N - 1);
    return Math.atan2(w, rest);
  }

  function drawAngle(amps, visibility) {
    const { c, R } = angle;
    const phi = stateAngle(amps);
    const op = visibility;
    const ex = c + R * Math.cos(phi);
    const ey = c - R * Math.sin(phi);
    angle.arrow.setAttribute("x2", r2(c + (R - 9) * Math.cos(phi)));
    angle.arrow.setAttribute("y2", r2(c - (R - 9) * Math.sin(phi)));
    const hx = Math.cos(phi), hy = -Math.sin(phi);
    const px = -hy, py = hx;
    const base = 12, half = 6;
    angle.head.setAttribute("d",
      `M${r2(ex)},${r2(ey)}` +
      `L${r2(ex - hx * base + px * half)},${r2(ey - hy * base + py * half)}` +
      `L${r2(ex - hx * base - px * half)},${r2(ey - hy * base - py * half)}Z`);

    const rr = 34;
    const large = Math.abs(phi) > Math.PI ? 1 : 0;
    const sweep = phi >= 0 ? 0 : 1;
    angle.arc.setAttribute("d",
      `M${c},${c}L${c + rr},${c}A${rr},${rr} 0 ${large} ${sweep} ${r2(c + rr * Math.cos(phi))},${r2(c - rr * Math.sin(phi))}Z`);

    [angle.arrow, angle.head, angle.arc].forEach((n) => n.setAttribute("opacity", op));
    angle.value.textContent = op > 0.5 ? `${degOf(phi)}° from "everything else"` : "";
  }

  // ---------------------------------------------------- python tutor panel

  const kw = (s) => `<span class="kw">${s}</span>`;
  const fn = (s) => `<span class="fn">${s}</span>`;
  const nm = (s) => `<span class="num">${s}</span>`;

  function codeLines() {
    const c = card;
    const done = measured;
    return [
      { plain: `target = ${c.target}`, html: `target = ${nm(c.target)}`, cm: "the card you picked" },
      { plain: "n = qubit_count(target)", html: `n = ${fn("qubit_count")}(target)`, cm: `${c.n} qubits` },
      { plain: "N = 2 ** n", html: `N = ${nm(2)} ** n`, cm: `${c.N} possible readings` },
      { plain: "", html: "", cm: null },
      { plain: "state = start(n)", html: `state = ${fn("start")}(n)`, cm: "every qubit reads 0" },
      { plain: "state = hadamard_all(state)", html: `state = ${fn("hadamard_all")}(state)`, cm: `even split, ${amp(1 / Math.sqrt(c.N))} each` },
      { plain: "", html: "", cm: null },
      { plain: "for round in range(1, rounds + 1):", html: `${kw("for")} round ${kw("in")} ${fn("range")}(${nm(1)}, rounds + ${nm(1)}):`, cm: "", id: "loop" },
      { plain: "    state = oracle(state, target)", html: `    state = ${fn("oracle")}(state, target)`, cm: `flip whatever passes a*b == ${c.target}` },
      { plain: "    state = diffuse(state)", html: `    state = ${fn("diffuse")}(state)`, cm: "reflect about the average" },
      { plain: "", html: "", cm: null },
      { plain: "label = measure(state)", html: `label = ${fn("measure")}(state)`, cm: done ? `got ${bitsOf(done.label, c.n)}` : "one random reading" },
      { plain: "a, b = split_label(label)", html: `a, b = ${fn("split_label")}(label)`, cm: done ? `a = ${done.a}, b = ${done.b}` : "read the two registers" },
    ];
  }

  const PAD = 36;

  function renderCode() {
    const list = $("code");
    list.innerHTML = "";
    codeLines().forEach((line, i) => {
      const li = document.createElement("li");
      li.dataset.line = i + 1;
      let html = line.html;
      if (line.cm !== null) {
        const pad = " ".repeat(Math.max(1, PAD - line.plain.length));
        html += `${pad}<span class="cm"># <span class="live" data-cm="${i + 1}">${line.cm}</span></span>`;
      }
      li.innerHTML = html || " ";
      list.appendChild(li);
    });
  }

  function setComment(line, text) {
    const span = document.querySelector(`[data-cm="${line}"]`);
    if (span && span.textContent !== text) span.textContent = text;
  }

  function highlightCode() {
    const it = info(frame);
    const now = it.kind === "start" ? 5
      : it.kind === "spread" ? 6
      : it.kind === "oracle" ? 9
      : 10;
    const items = $("code").children;
    for (let i = 0; i < items.length; i++) {
      const n = i + 1;
      items[i].className = "";
      if (measured && (n === 12 || n === 13)) { items[i].className = "now"; continue; }
      if (n === now && !measured) items[i].className = "now";
      else if (n === 8 && (it.kind === "oracle" || it.kind === "diffuse")) items[i].className = "loop";
      else if (n < now || (n === 9 && it.kind === "diffuse") || (n === 10 && it.round > 1 && it.kind === "oracle")) items[i].className = "done";
      else if (n > now) items[i].className = "ahead";
    }
    const r = it.round;
    setComment(8, r > 0
      ? (r > card.best ? `round ${r}, past the ${card.best} planned` : `round ${r} of ${card.best} planned`)
      : `rounds = ${card.best}, planned up front`);
    const lines = codeLines();
    setComment(12, lines[11].cm);
    setComment(13, lines[12].cm);
  }

  function updateVars() {
    const it = info(frame);
    const rows = [
      ["target", String(card.target), ""],
      ["n", String(card.n), "qubits"],
      ["N", String(card.N), "labels"],
      ["rounds", String(card.best), "≈ π/4·√N, fixed in advance"],
      ["round", it.round > 0 ? String(it.round) : "—", it.round > card.best ? "past the plan" : ""],
    ];
    const box = $("vars");
    const old = box.querySelectorAll("dd");
    box.innerHTML = rows.map(([k, v, aside]) =>
      `<dt>${k}</dt><dd>${v}${aside ? `<span class="aside">${aside}</span>` : ""}</dd>`).join("");
    const fresh = box.querySelectorAll("dd");
    fresh.forEach((dd, i) => {
      if (old[i] && old[i].firstChild && old[i].firstChild.textContent !== dd.firstChild.textContent) {
        dd.classList.add("flash");
      }
    });

    $("list-len").textContent = `list[${card.N}]`;
    renderCells(drawn);
  }

  function renderCells(amps) {
    const N = card.N;
    const w = card.winner;
    let picks;
    if (N <= 16) {
      picks = [...Array(N).keys()];
    } else {
      const set = new Set([0, 1, 2, w, N - 1]);
      picks = [...set].sort((a, b) => a - b);
    }
    let html = "";
    let last = -1;
    for (const i of picks) {
      if (i - last > 1) html += `<div class="cell gap">…</div>`;
      html += `<div class="cell${i === w ? " win" : ""}" title="${bitsOf(i, card.n)}">` +
        `<span class="i">${i}</span><span class="v" data-cell="${i}">${amp(amps[i])}</span></div>`;
      last = i;
    }
    if (last < N - 1) html += `<div class="cell gap">…</div>`;
    $("cells").innerHTML = html;
  }

  function updateLive(amps, avg) {
    const chance = chanceOf(amps);
    const statEl = $("stat-value");
    if (statEl) statEl.textContent = pct(chance);
    document.querySelectorAll("[data-cell]").forEach((span) => {
      span.textContent = amp(amps[+span.dataset.cell]);
    });
    const rows = [
      [`state[${card.winner}]`, amp(amps[card.winner]), `the answer, ${card.winnerBits}`],
      ["chance", pct(chance), "its amplitude squared"],
    ];
    if (avg !== undefined && avg !== null) rows.push(["average", amp(avg), "the line it reflects about"]);
    $("peek").innerHTML = `<dt style="grid-column:1/-1;font-family:var(--sans);font-size:.72rem;` +
      `letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">peeked · simulator only</dt>` +
      rows.map(([k, v, aside]) => `<dt>${k}</dt><dd>${v}<span class="aside">${aside}</span></dd>`).join("");
    drawAngle(amps, frame === 0 ? 0 : 1);
  }

  // -------------------------------------------------------------- narration
  // Written in William's voice. These are his words for his demo.

  const FLIPS = [
    () => "Same rule, same flip. The answer's bar is taller now, so flipping it drags the next average down harder.",
    () => "Flip it again. Measurement still can't see this part. The chance is exactly what it was a step ago.",
    () => "Mark the answer again. Nothing visible changes in the odds. The next reflection is where it cashes in.",
  ];
  const REFLECTS = [
    (a, b) => `Reflect again. ${a} → ${b}. Each round turns the state by the same small angle toward the answer.`,
    (a, b) => `${a} → ${b}. The wrong answers each shrink a little, and that probability has to go somewhere. It goes to the answer.`,
    (a, b) => `${a} → ${b}. That's honestly the whole algorithm: shuffling and flipping, on repeat.`,
  ];

  function narration(f) {
    const c = card;
    const it = info(f);
    const r = it.round;
    const now = c.chances[Math.max(0, roundsShown(f))];
    const before = r >= 1 ? c.chances[r - 1] : 0;
    const even = 1 / Math.sqrt(c.N);

    if (it.kind === "start") return {
      title: "Every qubit starts at 0",
      body: `${c.n} qubits, so ${c.N} possible readings. Right now all of the amplitude sits on one label, ` +
        `${"0".repeat(c.n)}, which is definitely not the answer. As a list it's a single 1 followed by ` +
        `${c.N - 1} zeros. Hit play, or step through it.`,
    };
    if (it.kind === "spread") return {
      title: "Spread it evenly",
      body: `One H gate on every qubit splits that 1 across all ${c.N} labels. Each one gets ` +
        `1/√${c.N} ≈ ${amp(even)}. Square it and every label has the same ${pct(1 / c.N)} chance. ` +
        `That's the honest starting line: we don't know anything yet, so nothing gets favored.`,
    };
    if (it.kind === "oracle" && r === 1) return {
      title: "Round 1 · the oracle marks the answer",
      body: `The oracle checks one rule against every label: does a × b = ${c.target}? Whatever passes gets ` +
        `its sign flipped, so the orange bar drops below the line. Here's the catch: ` +
        `(−${amp(even)})² is the same as (${amp(even)})², so the chance didn't move at all. Measure right ` +
        `now and the answer comes up exactly as often as everything else.`,
    };
    if (it.kind === "diffuse" && r === 1) return {
      title: "Round 1 · reflect about the average",
      body: `This is where the minus sign pays off. It's invisible to measurement, but it isn't invisible to ` +
        `the average. That one flipped bar drags the average down. Now reflect every bar about that line: the ` +
        `wrong answers were sitting just above it, so they drop. The answer was way below it, so it gets thrown ` +
        `way up. ${pct(before)} → ${pct(now)}.`,
    };
    if (r > c.best) {
      const firstPast = r === c.best + 1;
      if (it.kind === "oracle") {
        if (firstPast) return {
          title: `Round ${r} · past the sweet spot`,
          body: "Still flipping, same as always. We're past the best angle now, so the next reflection " +
            "carries us further around instead of closer.",
        };
        return { title: `Round ${r} · flip`, body: "Flip again. The odds never move on this step, only on the reflection after it." };
      }
      const rising = now >= before;
      const wasRising = r >= 2 && before >= c.chances[r - 2];
      if (rising && !wasRising) return {
        title: `Round ${r} · coming back around`,
        body: `${pct(before)} → ${pct(now)}. It's climbing again. Keep going and it would reach the answer a ` +
          `second time, then leave it again. It's a circle, not a search, so there's no prize for running it longer.`,
      };
      if (rising) return {
        title: `Round ${r} · still climbing`,
        body: `${pct(before)} → ${pct(now)}. Back toward the answer for a second lap.`,
      };
      if (now < 0.05 && before >= 0.05) return {
        title: `Round ${r} · almost all the way around`,
        body: `${pct(before)} → ${pct(now)}. The answer is nearly back to nothing, about a quarter turn past it.`,
      };
      if (firstPast) return {
        title: `Round ${r} · overshooting`,
        body: `${pct(before)} → ${pct(now)}. It's going down. Grover isn't a search that keeps getting better, it's ` +
          `a rotation, and we just rotated right past the answer. That's why you work out the round count ` +
          `before you start instead of just running it longer.`,
      };
      return {
        title: `Round ${r} · still falling`,
        body: `${pct(before)} → ${pct(now)}. Further past it with every round.`,
      };
    }
    if (it.kind === "diffuse" && r === c.best) return {
      title: `Round ${r} · the sweet spot`,
      body: `That's ${c.best} rounds, right about π/4 · √${c.N} ≈ ${(Math.PI / 4 * Math.sqrt(c.N)).toFixed(1)}. ` +
        `The answer is at ${pct(now)}. This is the moment to measure. A blind guess-and-check over ` +
        `${c.N} labels would take about ${c.N / 2} tries on average.`,
    };
    if (it.kind === "oracle") return { title: `Round ${r} · flip`, body: FLIPS[r % FLIPS.length]() };
    return { title: `Round ${r} · reflect`, body: REFLECTS[r % REFLECTS.length](pct(before), pct(now)) };
  }

  function narrate(text) {
    const box = document.querySelector(".narration");
    $("nar-title").textContent = text.title;
    $("nar-body").textContent = text.body;
    box.classList.remove("swap");
    void box.offsetWidth;
    box.classList.add("swap");
  }

  // ------------------------------------------------------------ the engine

  function animateTo(from, to, ms, onFrame) {
    if (anim) anim.cancel();
    return new Promise((resolve) => {
      let finished = false;
      let raf = 0;
      const t0 = performance.now();
      const cur = new Array(from.length);
      const finish = () => {
        if (finished) return;
        finished = true;
        cancelAnimationFrame(raf);
        onFrame(to);
        anim = null;
        resolve();
      };
      anim = { cancel: finish };
      if (ms <= 0 || reduceMotion) { finish(); return; }
      const tick = (now) => {
        if (finished) return;
        const t = Math.min(1, (now - t0) / ms);
        const k = ease(t);
        for (let i = 0; i < from.length; i++) cur[i] = from[i] + (to[i] - from[i]) * k;
        onFrame(cur);
        if (t < 1) raf = requestAnimationFrame(tick);
        else finish();
      };
      raf = requestAnimationFrame(tick);
    });
  }

  async function goTo(target, quick) {
    const f = clamp(target, 0, lastFrame());
    const forward = f === frame + 1 && !quick;
    const from = drawn.slice();
    const to = card.frames[f];
    frame = f;
    measured = null;
    $("result").innerHTML = "";
    $("btn-measure").textContent = "Measure";

    const it = info(f);
    const later = it.round > 2;
    let ms = 260;
    if (forward) {
      if (it.kind === "spread") ms = 1150;
      else if (it.kind === "oracle") ms = later ? 420 : 680;
      else if (it.kind === "diffuse") ms = later ? 640 : 980;
    }
    ms /= speed;

    highlightCode();
    narrate(narration(f));
    updateWhere();
    updateStatSub();

    let avg = null;
    if (it.kind === "diffuse") {
      avg = mean(from);
      drawAverage(avg);
      showAverage(true);
      if (forward) {
        Sound.whoosh(ms / 1000 + 0.2);
        await wait(Math.min(240, ms * 0.3));
      }
    } else {
      showAverage(false);
      if (forward && it.kind === "oracle") Sound.tick();
    }

    await animateTo(from, to, ms, (cur) => {
      drawBars(cur);
      updateLive(cur, avg);
    });
    drawn = to.slice();
    updateVars();
    updateTable();
    drawCurve();
    updateButtons();
  }

  async function play() {
    if (playing) return;
    if (frame >= lastFrame()) await goTo(0, true);
    playing = true;
    updateButtons();
    const stopAt = frame < bestFrame() ? bestFrame() : lastFrame();
    while (playing && frame < stopAt) {
      await goTo(frame + 1);
      if (!playing) break;
      const early = frame <= 3;
      const mid = frame <= 7;
      await wait((early ? 2400 : mid ? 1300 : 450) / speed);
    }
    playing = false;
    updateButtons();
  }
  function stop() { playing = false; updateButtons(); }
  function togglePlay() { if (playing) stop(); else play(); }
  function stepForward() { stop(); if (frame < lastFrame()) goTo(frame + 1); }
  function stepBack() { stop(); if (frame > 0) goTo(frame - 1, true); }
  function reset() { stop(); goTo(0, true); }
  function keepGoing() { stop(); play(); }

  function updateWhere() {
    const it = info(frame);
    let text;
    if (it.kind === "start") text = "start";
    else if (it.kind === "spread") text = "even split";
    else {
      const verb = it.kind === "oracle" ? "flip" : "reflect";
      text = it.round > card.best
        ? `round ${it.round} · ${verb} · past the plan`
        : `round ${it.round} of ${card.best} · ${verb}`;
    }
    $("where").textContent = text;
  }

  function updateStatSub() {
    let text;
    if (frame === 0) text = `everything is on ${"0".repeat(card.n)} right now`;
    else if (frame === bestFrame()) text = `${card.best} rounds, vs ~${card.N / 2} blind guesses`;
    else if (frame > bestFrame()) {
      const r = roundsShown(frame);
      text = card.chances[r] >= card.chances[r - 1] ? "past the sweet spot, coming back around"
        : "past the sweet spot, falling";
    }
    else text = `a blind guess is 1 in ${card.N}`;
    const subEl = $("stat-sub");
    if (subEl) subEl.textContent = text;
  }

  function updateButtons() {
    const play = $("btn-play");
    if (playing) { play.textContent = "❚❚ Pause"; play.setAttribute("aria-label", "Pause"); }
    else if (frame >= lastFrame()) { play.textContent = "⟲ Replay"; play.setAttribute("aria-label", "Replay"); }
    else { play.textContent = "▶ Play"; play.setAttribute("aria-label", "Play"); }
    $("btn-back").disabled = frame === 0;
    $("btn-step").disabled = frame >= lastFrame();
    const atSweet = frame === bestFrame();
    $("btn-measure").classList.toggle("ready", atSweet && !measured);
    $("btn-keep").hidden = !(frame >= bestFrame() && frame < lastFrame() && !playing);
  }

  // ---------------------------------------------------------------- measure

  function measure() {
    stop();
    if (anim) anim.cancel();
    const amps = card.frames[frame];
    let roll = Math.random();
    let label = amps.length - 1;
    for (let i = 0; i < amps.length; i++) {
      roll -= amps[i] * amps[i];
      if (roll <= 0) { label = i; break; }
    }
    const [a, b] = split(label);
    const ok = a > 1 && b > 1 && a * b === card.target;
    measured = { label, a, b, ok };

    const text = bitsOf(label, card.n);
    const chance = chanceOf(amps);
    $("result").innerHTML =
      `<div class="bits typing"><span class="ra">${text.slice(0, card.aBits)}</span>` +
      `<span class="rb">${text.slice(card.aBits)}</span></div>` +
      `<div class="read">register a = ${a} · register b = ${b}</div>` +
      `<div class="verdict ${ok ? "ok" : "no"}">${a} × ${b} = ${a * b}${ok ? "" : ` ≠ ${card.target}`}</div>`;

    if (ok) {
      narrate({
        title: `Measured ${text}`,
        body: `Read the two registers: a = ${a}, b = ${b}. Check it the boring classical way: ` +
          `${a} × ${b} = ${card.target}. Checking is the easy part. Finding it was the hard part, and that's ` +
          `the whole point.`,
      });
      const first = !solved.has(card.target);
      solved.add(card.target);
      Sound.chime();
      renderHand();
      if (first) {
        const node = [...document.querySelectorAll(".pcard")]
          .find((n) => n.getAttribute("aria-checked") === "true");
        if (node) node.classList.add("celebrate");
      }
      placeCallout(drawn);
    } else {
      narrate({
        title: `Measured ${text}`,
        body: `That reads as a = ${a}, b = ${b}, and ${a} × ${b} = ${a * b}. Not it. That's allowed, it's ` +
          `probabilistic` + (chance < 0.5 ? `, and at ${pct(chance)} it's not even surprising` : "") +
          `. Checking is cheap, so you just run it again. Measuring wipes the state out, so "again" ` +
          `means rerunning everything from scratch, which on real hardware is the only way to get a second sample.`,
      });
    }
    $("btn-measure").textContent = "Run it again and measure";
    highlightCode();
    updateButtons();
  }

  // ------------------------------------------------------------- the tables

  function updateTable() {
    const rows = [];
    for (let i = 0; i < card.N; i++) {
      const [a, b] = split(i);
      const v = drawn[i];
      rows.push(`<tr${i === card.winner ? ' class="win"' : ""}><td>${bitsOf(i, card.n)}</td>` +
        `<td>${a}</td><td>${b}</td><td>${amp(v)}</td><td>${pct(v * v)}</td></tr>`);
    }
    const tableEl = $("amp-table");
    if (!tableEl) return;
    tableEl.innerHTML =
      "<thead><tr><th>label</th><th>a</th><th>b</th><th>amplitude</th><th>chance</th></tr></thead>" +
      `<tbody>${rows.join("")}</tbody>`;
  }

  function renderCompare() {
    const rows = DATA.cards.map((c) =>
      `<tr${c === card ? ' class="current"' : ""}><td>${c.target}</td><td>${c.N}</td>` +
      `<td>~${c.N / 2}</td><td>${c.best}</td></tr>`);
    $("compare").innerHTML =
      "<thead><tr><th>card</th><th>labels</th><th>blind guesses</th><th>Grover rounds</th></tr></thead>" +
      `<tbody>${rows.join("")}</tbody>`;
  }

  // ------------------------------------------------------------ compilation
  // How the target becomes a circuit, using the numbers export_demo.py got
  // from Cirq: register sizing, chapter 5's gates, those gates lowered to CZ,
  // and the SWAPs it takes to route them onto a chip shaped like a line.

  const thousands = (v) => v.toLocaleString("en-US");

  function registerBoxes() {
    const box = (from, count) => {
      let cells = "";
      for (let i = from; i < from + count; i++) cells += `<span class="q">q${i}</span>`;
      return cells;
    };
    return `<div class="regs">` +
      `<div class="reg a"><div class="qs">${box(0, card.aBits)}</div>` +
      `<span class="cap">register a · holds up to ${2 ** card.aBits - 1}</span></div>` +
      `<div class="reg b"><div class="qs">${box(card.aBits, card.bBits)}</div>` +
      `<span class="cap">register b · holds up to ${2 ** card.bBits - 1}</span></div>` +
      `</div>`;
  }

  function renderCompile() {
    const c = card;
    const k = c.compile;
    const ours = k.ours;
    const naive = k.naive;
    const aRoot = k.isqrt.toString(2);
    const bHalf = k.half.toString(2);
    const t = String(c.target);

    $("cmp-title").textContent = `Compiling ${c.target} into a circuit`;

    const line1 = `a ≤ b, so a ≤ √${t}`.padEnd(24) + `isqrt(${t}) = ${k.isqrt}`.padEnd(16) +
      `→ ${aRoot}`.padEnd(9) + `→ ${c.aBits} bits`;
    const line2 = `a ≥ 2, so b ≤ ${t} ÷ 2`.padEnd(24) + `${t} // 2 = ${k.half}`.padEnd(16) +
      `→ ${bHalf}`.padEnd(9) + `→ ${c.bBits} bits`;
    const line3 = " ".repeat(40) + `${c.aBits} + ${c.bBits} = ${c.n} qubits, ${c.N} labels`;

    $("cmp-steps").innerHTML =
      `<li><h4>Size the registers from the target alone</h4>` +
        `<pre class="calc">${escapeHtml([line1, line2, line3].join("\n"))}</pre>` +
        registerBoxes() +
        `<p>Both bounds come from ${c.target} itself, never from its factors. Sizing a register to fit the ` +
        `real answer would leak how big the answer is. Sizing both for the biggest possible factor would ` +
        `take ${naive.qubits} qubits and ${2 ** naive.qubits} labels.</p></li>` +

      `<li><h4>Write the oracle as gates</h4>` +
        `<pre class="circuit">${escapeHtml(ours.diagram)}</pre>` +
        `<p>${ours.gates} gates, depth ${ours.depth}. X gates disguise the zeros, one controlled Z fires on ` +
        `the answer, then the X gates take the disguise back off. This is the chapter 5 code I wrote. It's ` +
        `aimed using the known answer, which is the shortcut; the real version compiles the multiplier ` +
        `instead.</p></li>` +

      `<li><h4>Lower it to what the chip actually has</h4>` +
        `<div class="figs">` +
          `<div><b>${thousands(ours.nativeOps)}</b><span>native operations</span></div>` +
          `<div><b>${thousands(ours.cz)}</b><span>two-qubit CZ gates</span></div>` +
          `<div><b>${thousands(ours.nativeDepth)}</b><span>depth</span></div>` +
        `</div>` +
        `<p>No chip has a ${c.n}-qubit controlled Z. Cirq rewrites that one line into CZs and single-qubit ` +
        `rotations. It does it without borrowing any spare qubits; with a few scratch qubits it gets much ` +
        `cheaper, which is one of the tradeoffs a compiler gets to make.</p></li>` +

      `<li><h4>Route it onto a chip</h4>` +
        `<div class="figs">` +
          `<div><b>+${thousands(ours.swaps)}</b><span>SWAPs inserted</span></div>` +
          `<div><b>+${thousands(ours.swaps * 3)}</b><span>more two-qubit gates</span></div>` +
        `</div>` +
        `<p>Qubits can only interact with their neighbours. On a chip wired as a line, Cirq has to SWAP ` +
        `them next to each other first, and every SWAP costs three more two-qubit gates. A line is close to ` +
        `a worst case: neutral-atom machines like Infleqtion's are far better connected, and an atom can ` +
        `sometimes be physically moved instead of SWAPped.</p></li>`;

  }

  // ------------------------------------------------------------- assembly

  function rebuild() {
    $("hero-n").textContent = card.N;
    const subEl2 = $("chart-sub");
    if (subEl2) subEl2.textContent =
      `${card.N} labels, one bar each. Above the line is positive, below is negative.`;
    $("btn-measure").textContent = "Measure";
    $("result").innerHTML = "";
    buildBars();
    buildCurve();
    buildAngle();
    renderCode();
    renderCompare();
    renderCompile();
    drawBars(drawn);
    showAverage(false);
    updateLive(drawn);
    updateVars();
    updateTable();
    drawCurve();
    highlightCode();
    narrate(narration(frame));
    updateWhere();
    updateStatSub();
    updateButtons();
  }

  function redrawOnly() {
    buildBars();
    buildCurve();
    buildAngle();
    drawBars(drawn);
    const it = info(frame);
    if (it.kind === "diffuse") {
      drawAverage(mean(card.frames[frame - 1]));
      showAverage(true);
    }
    updateLive(drawn, it.kind === "diffuse" ? mean(card.frames[frame - 1]) : null);
    drawCurve();
  }

  function wire() {
    $("btn-play").addEventListener("click", togglePlay);
    $("btn-step").addEventListener("click", stepForward);
    $("btn-back").addEventListener("click", stepBack);
    $("btn-reset").addEventListener("click", reset);
    $("btn-measure").addEventListener("click", measure);
    $("btn-keep").addEventListener("click", keepGoing);

    document.querySelectorAll("[data-speed]").forEach((button) => {
      button.addEventListener("click", () => {
        speed = parseFloat(button.dataset.speed);
        document.querySelectorAll("[data-speed]").forEach((b) =>
          b.setAttribute("aria-pressed", b === button ? "true" : "false"));
      });
    });

    const soundButton = $("sound-toggle");
    const paintSound = () => {
      soundButton.textContent = Sound.on ? "🔊" : "🔇";
      soundButton.setAttribute("aria-pressed", Sound.on ? "true" : "false");
      soundButton.setAttribute("aria-label", Sound.on ? "Turn sound off" : "Turn sound on");
    };
    soundButton.addEventListener("click", () => { Sound.setOn(!Sound.on); paintSound(); });
    paintSound();

    document.addEventListener("keydown", (e) => {
      if (e.target.closest && e.target.closest("input, textarea, select")) return;
      if (e.key === " " && e.target.tagName === "BUTTON") return;
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowRight") stepForward();
      else if (e.key === "ArrowLeft") stepBack();
      else if (e.key === "r" || e.key === "R") reset();
      else if (e.key === "m" || e.key === "M") measure();
    });

    // Charts redraw whenever their own box changes size: a window resize, or a
    // panel being dragged bigger in the arrange view.
    let pending = 0;
    const seen = new Map();
    const later = () => { clearTimeout(pending); pending = setTimeout(redrawOnly, 120); };
    if (window.ResizeObserver) {
      const watcher = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const box = entry.contentRect;
          const key = Math.round(box.width) + "x" + Math.round(box.height);
          if (seen.get(entry.target) !== key) { seen.set(entry.target, key); later(); }
        }
      });
      ["bars-box", "curve-box"].forEach((id) => { const n = $(id); if (n) watcher.observe(n); });
    } else {
      window.addEventListener("resize", later);
    }
    window.addEventListener("demo-layout", later);

    wireBarHover();
    wireCurveHover();
  }

  renderHand();
  wire();
  rebuild();

  // A handle for tools/check_demo.mjs, and for poking at it in devtools.
  window.__groverDemo = {
    cards: DATA.cards, info, narration, goTo, chooseCard, measure,
    get frame() { return frame; },
    get card() { return card; },
    get measured() { return measured; },
  };
})();
