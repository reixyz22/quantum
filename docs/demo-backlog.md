# Demo backlog

Things to build into the demo **after chapters 6 onward are rewritten**. They're
written down here so they don't get built against code that's about to change.

From William's review on 2026-10-01.

## Step into `oracle()` and `diffuse()` while it runs

The code panel shows Grover at the level of:

```python
for round in range(1, rounds + 1):
    state = oracle(state, target)
    state = diffuse(state)
```

That's honest about the loop, but it hides everything inside the two calls,
and those calls are the algorithm. Thirteen lines is the skeleton of Grover,
not the heart of it.

Wanted: a debugger-style **step into**. When `oracle(...)` or `diffuse(...)` is
the live line, you can open it and watch its body run, then step back out.

- **`oracle()`**: once chapter 9 exists, the multiplier and comparator gates,
  with the marked label lighting up as the comparator fires. Until then, the
  per-label rule check, clearly labelled as the simulator stand-in.
- **`diffuse()`**: the average being computed, then each amplitude reflected
  about it. Once chapter 6's gate version exists, its gates instead.
  **Do not show the gate construction of the diffuser before William has built
  it himself** — it's his puzzle. Show the arithmetic until then.
- A small call stack strip (`grover > oracle`) so it's always clear which
  frame is live, plus **step out**.
- The variables panel follows the frame you're in.

**Blocked on:** chapter 6's gate-level diffuser and chapter 9's compiled oracle.
The demo currently applies both as matrices, so anything built against them
now would be thrown away.

**Data:** `export_demo.py` would need to record intermediate states *inside*
each oracle and diffuser application, not just after it. Simulating the gate
versions with `simulate_moment_steps` gives those for free.

## Done in the same review

- Panels can be dragged, resized and locked (`web/layout.js`), saved per device.
- A compilation panel shows how the target becomes a circuit: register sizing,
  chapter 5's gates, the native CZ count, and SWAPs on a line-shaped chip, each
  compared against sizing both registers naively.
- The RSA note is bullets on screen rather than paragraphs.
