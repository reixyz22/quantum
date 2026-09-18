// One entry per chapter. Mirrors the chNN_*.py files at the repo root.
// `body` is trusted HTML written by us, not user input.
window.CHAPTERS = [
  {
    num: "00",
    title: "Amounts, labels, and entanglement",
    file: "ch00_bell.py",
    status: "done",
    body: `
      <pre>q0: ───H───@───
          │
q1: ───────X───</pre>
      <h2>Reading one line of output</h2>
      <pre>after step 0: 0.707|00⟩ + 0.707|10⟩</pre>
      <ol>
        <li><code>|00⟩</code> is a <b>label</b>: q0 reads 0, q1 reads 0. The first digit is q0.</li>
        <li><code>0.707</code> is the <b>amount</b> on that label. Square it to get the chance: 0.707² = 0.5, so 50%.</li>
        <li><code>+</code> means <b>"and also"</b>. Both are in the state at once.</li>
      </ol>
      <p><b>Why 00 and 10?</b> H only touched q0, so only the first digit varies.</p>
      <h2>The CNOT</h2>
      <p>Rule: if q0 is 1, flip q1. Apply it to each part separately (this is called <b>linearity</b>):</p>
      <ol>
        <li><code>|00⟩</code>: q0 is 0, so it stays <code>|00⟩</code>.</li>
        <li><code>|10⟩</code>: q0 is 1, so it becomes <code>|11⟩</code>.</li>
      </ol>
      <p>Now the qubits always agree. That's <b>entanglement</b>.</p>
      <h2>The counts</h2>
      <pre>local counts: Counter({0: 63, 3: 37})</pre>
      <p>0 = <code>00</code>, 3 = <code>11</code>. It's not exactly 50/50 because each run is a random draw. More shots get closer to 50/50.</p>
      <div class="check">
        <b>Check:</b> step 0 gave <code>0.707|01⟩ + 0.707|11⟩</code>. What does the CNOT make it?
        <details><summary>Answer</summary><code>0.707|01⟩ + 0.707|10⟩</code></details>
      </div>`,
  },
  {
    num: "01",
    title: "Interference: signs that cancel",
    file: "ch01_interference.py",
    status: "in progress",
    body: `
      <h2>The full H rule</h2>
      <pre>H|0⟩ → 0.707|0⟩ + 0.707|1⟩
H|1⟩ → 0.707|0⟩ − 0.707|1⟩</pre>
      <p>Same chances, but a hidden <b>minus sign</b> on the second one.</p>
      <h2>H twice</h2>
      <pre>0.707·H|0⟩ + 0.707·H|1⟩
= (0.5|0⟩ + 0.5|1⟩) + (0.5|0⟩ − 0.5|1⟩)
= 1|0⟩</pre>
      <ol>
        <li><b>Destructive:</b> the <code>|1⟩</code> amounts cancel, +0.5 − 0.5 = 0.</li>
        <li><b>Constructive:</b> the <code>|0⟩</code> amounts add, 0.5 + 0.5 = 1.</li>
        <li>A random coin can never return to certainty. A qubit can, because <b>amounts can be negative</b>.</li>
      </ol>
      <p><b>Grover's trick:</b> make the wrong answers cancel and the right answer add up.</p>
      <div class="check">
        <b>Check:</b> start at <code>|1⟩</code> and apply H twice. Where do you end up?
        <details><summary>Answer</summary>Back at <code>|1⟩</code>. This time <code>|0⟩</code> cancels.</details>
      </div>`,
  },
  { num: "02", title: "Equal balance: H on every qubit", status: "locked" },
  { num: "03", title: "The oracle: flipping the key's sign", status: "locked" },
  { num: "04", title: "The diffuser: reflecting around balance", status: "locked" },
  { num: "05", title: "Repeat π/4·√N times", status: "locked" },
  { num: "06", title: "Run it on Superstaq", status: "locked" },
];
