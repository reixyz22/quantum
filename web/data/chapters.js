// One entry per chapter. `num` is the curriculum order and `file` is the
// Python file, kept as separate fields so the two can be renumbered apart.
// `body` is trusted HTML written by us, not user input.
window.CHAPTERS = [
  {
    num: "01",
    title: "Amplitudes, and why they can be negative",
    file: "ch01_amplitudes.py",
    status: "done",
    body: `
      <h2>Two words first</h2>
      <pre>0.354|000&rangle;  -  0.354|111&rangle;</pre>
      <ol>
        <li>A <b>label</b> is the thing inside the brackets. One of the possible readings.</li>
        <li>An <b>amplitude</b> is the number in front. It is <i>not</i> the sign &mdash; the sign is just part of the number, the way it is in &minus;5.</li>
        <li>Square an amplitude to get the chance of reading that label. 0.354&sup2; = 0.125, so 12.5%.</li>
      </ol>
      <p>The amplitude is always the <b>bigger</b> number, because squaring something under 1 makes it smaller. If you ever end up with an amplitude smaller than its chance, you went the wrong way.</p>

      <h2>Two gates that both get called "flip"</h2>
      <table>
        <tr><th>gate</th><th>on |0&rangle;</th><th>on |1&rangle;</th></tr>
        <tr><td><code>X</code></td><td>becomes |1&rangle;</td><td>becomes |0&rangle;</td></tr>
        <tr><td><code>Z</code></td><td><b>nothing</b></td><td>becomes &minus;|1&rangle;</td></tr>
      </table>
      <p><code>X</code> flips the <b>bit</b>. <code>Z</code> flips the <b>sign</b>, and never touches the bit.</p>

      <h2>Why negative amplitudes matter</h2>
      <pre>H|0&rangle; &rarr; 0.707|0&rangle; + 0.707|1&rangle;
H|1&rangle; &rarr; 0.707|0&rangle; &minus; 0.707|1&rangle;</pre>
      <p>Apply H twice and you land back on |0&rangle;, dead certain:</p>
      <pre>(0.5|0&rangle; + 0.5|1&rangle;) + (0.5|0&rangle; &minus; 0.5|1&rangle;) = 1|0&rangle;</pre>
      <ol>
        <li>The |1&rangle; parts cancel: +0.5 &minus; 0.5 = 0.</li>
        <li>The |0&rangle; parts add: 0.5 + 0.5 = 1.</li>
        <li>A coin flipped twice can never return to certainty. Probabilities only pile up, because they can't be negative. Amplitudes can.</li>
      </ol>
      <p><b>That asymmetry is the only reason Grover exists.</b> The whole trick is arranging signs so wrong answers cancel and the right one adds up.</p>
      <div class="check">
        <b>Check:</b> A label has amplitude &minus;0.5. What is its chance, and how do you know you went the right way?
        <details><summary>Answer</summary>0.25, because (&minus;0.5)&sup2; = 0.25. And 0.5 is bigger than 0.25, which is what it should be &mdash; the amplitude is always the larger number.</details>
      </div>`,
  },
  {
    num: "02",
    title: "More than one qubit, and why the list doubles",
    file: "ch02_many_qubits.py",
    status: "done",
    body: `
      <h2>The doubling</h2>
      <pre>[a, b] &otimes; [c, d] = [a&middot;c, a&middot;d, b&middot;c, b&middot;d]
                    00     01     10     11</pre>
      <p>Two numbers in, two numbers in, <b>four</b> out. Every pair gets multiplied. Add a third qubit and all four split again, giving 8.</p>
      <p>So <b>n qubits give 2<sup>n</sup> labels</b>, not n&sup2;. Qubits double the list; they don't square it. That operation is called the <b>tensor product</b>.</p>

      <h2>The even split, and the one formula to keep</h2>
      <p>One H on every qubit puts the same amplitude on every label. Work it out chances-first and it never gets slippery:</p>
      <ol>
        <li><b>Count the labels.</b> 4 qubits &rarr; N = 2&#8308; = 16.</li>
        <li><b>Split the chance evenly.</b> Chances must total 1, so each is 1/16 = 0.0625.</li>
        <li><b>Square-root it for the amplitude.</b> &radic;0.0625 = 0.25.</li>
      </ol>
      <table>
        <tr><th>n qubits</th><th>N labels</th><th>chance each</th><th>amplitude each</th></tr>
        <tr><td>1</td><td>2</td><td>0.5</td><td>0.707</td></tr>
        <tr><td>2</td><td>4</td><td>0.25</td><td>0.5</td></tr>
        <tr><td>3</td><td>8</td><td>0.125</td><td>0.354</td></tr>
        <tr><td>4</td><td>16</td><td>0.0625</td><td>0.25</td></tr>
      </table>
      <p>Amplitudes never add to 1 &mdash; <b>chances do</b>. The amplitudes actually sum to &radic;N, which is the same &radic;N that shows up in the speedup.</p>

      <h2>Why this matters twice</h2>
      <p>This even split is Grover's starting line: nothing is favoured, because we don't know anything yet. And it's also the ceiling on simulation &mdash; 50 qubits means tracking about a quadrillion numbers, which is why real hardware exists.</p>
      <p>All n of those H gates run in a single Moment, so this costs depth 1 no matter how many qubits.</p>
      <div class="check">
        <b>Check:</b> 6 qubits. How many labels, what chance on each, what amplitude on each?
        <details><summary>Answer</summary>N = 2&#8310; = 64 labels. Chance 1/64. Amplitude &radic;(1/64) = 1/8. Fractions are cleaner here than decimals.</details>
      </div>`,
  },
  {
    num: "03",
    title: "Marking the winner, invisibly",
    file: "ch03_marking.py",
    status: "done",
    body: `
      <pre>0: ───H───@───
          │
1: ───H───@───
          │
2: ───H───@───</pre>
      <h2>The one new gate</h2>
      <p>That <code>@</code> column is a <b>controlled Z</b>. <code>@</code> is the ASCII stand-in for the filled dot textbooks draw, and it means "this qubit is a control". The vertical line is the wiring. It's drawn as wiring rather than labelled <code>CZ</code> because the gate spans three rows and a label only fits on one.</p>
      <p>All three are <code>@</code> because CZ is <b>symmetric</b> &mdash; any of them can be called the control. Compare a CNOT, which has a <code>@</code> and an <code>X</code>, because its two qubits do different jobs.</p>

      <h2>Why only |111&rangle; changes</h2>
      <pre>after step 0: 0.354|000&rangle; + ... + 0.354|111&rangle;
after step 1: 0.354|000&rangle; + ... &minus; 0.354|111&rangle;</pre>
      <p>The code reads <code>cirq.Z(q2).controlled_by(q0, q1)</code>: <i>if q0 and q1 both read 1, flip the sign of q2</i>. Two labels satisfy that &mdash; <code>110</code> and <code>111</code> &mdash; so the gate fires on both. Then:</p>
      <ol>
        <li><code>110</code>: q2 is <b>0</b>, and Z does nothing to a 0. Unchanged.</li>
        <li><code>111</code>: q2 is <b>1</b>, so Z leaves a minus.</li>
      </ol>
      <p>The gate fires twice and only one of them visibly does anything. Nothing stores the number 7 &mdash; <code>111</code> is special because it <i>is</i> the all-1s label, which is the gate's own condition.</p>

      <h2>And now the point of the chapter</h2>
      <pre>local counts: Counter({0: 120, 1: 116, 3: 108, 6: 101, 5: 97, 7: 95, 2: 83, 4: 80})</pre>
      <p>Label 7 is the winner, and it got an <b>average</b> share. Of course it did: (&minus;0.354)&sup2; = (0.354)&sup2;.</p>
      <p><b>The oracle changes no probabilities.</b> The mark is real in the amplitudes and completely invisible to measurement. Stop here and you could measure a million times and never find it. That gap is where the rest of Grover lives.</p>
      <div class="check">
        <b>Check:</b> Why can't you just run the oracle and then measure?
        <details><summary>Answer</summary>Because flipping a sign doesn't change any chance. Every label, winner included, still comes up with probability 1/N. You need the diffuser to turn the invisible mark into a visible one.</details>
      </div>`,
  },
  {
    num: "04",
    title: "An oracle from a rule, not a stored answer",
    file: "ch04_oracle.py",
    status: "done",
    body: `
      <h2>The fair objection</h2>
      <p>Chapter 3's oracle is just a circuit that checks for <code>111</code>. Read it and you know the answer. So it's a toy. The fix is to write a <b>rule</b> instead of a target:</p>
      <pre>def passes(a, b, target):
    if a &lt;= 1 or b &lt;= 1:
        return False      # 1 x target is not interesting
    if a &gt; b:
        return False      # keep only one of (a,b) and (b,a)
    return a * b == target</pre>
      <p>For target 15 the circuit uses 5 qubits, split into two groups: the <b>first 2</b> spell one number, the <b>last 3</b> spell another. So the label <code>11101</code> splits as <code>11</code> and <code>101</code>, which read as 3 and 5.</p>
      <pre>target 15: register a is 2 bits, b is 3 bits, 5 qubits, 32 labels
  marked 11101  -&gt;  a=3, b=5</pre>
      <p><b><code>15</code> is written down. <code>3</code> and <code>5</code> are not.</b> Where the minus lands is something the code discovers.</p>

      <h2>Sizing the two registers</h2>
      <p>The rule requires <code>a &le; b</code>, which means <code>a</code> can never exceed &radic;target. For 62 that caps <code>a</code> at 7 &mdash; 3 bits &mdash; while <code>b</code> needs 5 to hold 31. Sizing both for the worst case wastes 2 qubits and quadruples the search space for nothing.</p>
      <p>Classically this pass is called <b>bitwidth analysis</b>: prove a bound on a value, then narrow its representation. The quantum twist is that narrowing a register also shrinks what Grover has to search, so it pays twice &mdash; and since the cost is &radic;N, a 4&times; smaller space halves the round count.</p>
      <p>Both bounds come from the <b>target</b>, never from its factors. Sizing <code>a</code> to fit the real factor would leak how big that factor is through the register width.</p>

      <h2>The caveat, said out loud</h2>
      <p>Our code finds the winner by looping over every label and asking the rule. That loop <i>is</i> brute force. But <b>the loop is the simulator's cost, not the algorithm's</b> &mdash; it's how a laptop pretends to be a circuit. A real oracle is a multiplier built out of gates, which computes rather than remembers, and never enumerates anything.</p>
      <div class="check">
        <b>Check:</b> Target 12 is not on the playable list. Why not?
        <details><summary>Answer</summary>It has two answers, 2&times;6 and 3&times;4. More winners changes how many rounds Grover needs, and guessing that number wrong makes it overshoot, so the targets are filtered to semiprimes, which have exactly one.</details>
      </div>`,
  },
  {
    num: "05",
    title: "Aiming one sign-flipping gate at one label",
    file: "ch05_compiling.py",
    status: "in progress",
    body: `
      <p><b>This chapter is an exercise.</b> Three blanks, same self-checking runner as
      chapter 6 &mdash; except this one also compares your gates against chapter 4's matrix
      and tells you whether they do the same job.</p>
      <pre>python ch05_compiling.py        # or pass a target: ... 21</pre>

      <h2>Why the disguise</h2>
      <p>The only sign-flipping gate we have is a controlled Z, and it fires on exactly one
      pattern: <b>every qubit reading 1</b>. The winner for 15 is <code>11101</code>, not
      <code>11111</code>. So X the qubits that should read 0, let the CZ fire, then X them
      back. The X gates are a workaround for having one gate with a fixed trigger. Nothing
      deeper than that.</p>

      <h2>What this is NOT</h2>
      <p>This does <b>not</b> translate the checker into gates. It aims a flip at a label we
      already looked up, which is chapter 4's cheat wearing gates instead of a matrix. The
      real thing is chapter 9.</p>

      <h2>The seam</h2>
      <pre>circuit.append(cirq.H(q0))                # a real gate. hardware has this.
circuit.append(oracle_gate.on(*qubits))   # a 32x32 matrix. hardware does not.</pre>
      <p>A matrix says <i>what</i> should happen. Gates say <i>how</i>. The matrix is
      <b>opaque</b>: a compiler can simulate it but can't decompose it, can't route it onto a
      chip's connectivity, and can't cancel it against a neighbour. A matrix is a wish;
      gates are a program.</p>

      <h2>The three blanks</h2>
      <pre>def positions_needing_x(text):
    """Which positions of text hold a "0"?

    A controlled Z only fires when every qubit reads 1, so any qubit
    that should read 0 needs an X first, to disguise it as a 1.

    "11101" -> [3].   "1010" -> [1, 3].
    """</pre>
      <pre>def disguise(qubits, text):
    """One X gate on each qubit that needs disguising.

    cirq.X(qubit) makes an X. qubits[3] is the fourth qubit.
    Empty list is fine if the label has no zeros.
    """</pre>
      <pre>def oracle_from_gates(qubits, text):
    """Assemble the whole thing: disguise, fire, undisguise.

    Three appends. The SAME disguise list works both times, because
    two X gates on one qubit cancel. controlled_z() is written for you.
    """</pre>

      <h2>What passing looks like</h2>
      <pre>target   4 (2 x 2), winner 1010: 5 gates, depth 3 -> same operation
target   6 (2 x 3), winner 1011: 3 gates, depth 3 -> same operation
target  15 (3 x 5), winner 11101: 3 gates, depth 3 -> same operation
target  21 (3 x 7), winner 0110111: 5 gates, depth 3 -> same operation

0: ───────@───────
          │
1: ───────@───────
          │
2: ───────@───────
          │
3: ───X───@───X───
          │
4: ───────Z───────</pre>
      <p>Three gates, depth 3, replacing a 32&times;32 matrix. The check uses
      <code>cirq.allclose_up_to_global_phase</code> on the two unitaries &mdash; collapse each
      circuit to the single matrix it represents and compare. "Up to global phase" matters
      because multiplying an <i>entire</i> state by &minus;1 changes no measurement, so two
      circuits differing only by that are the same operation.</p>

      <div class="check">
        <b>Check:</b> Why does a compiler care whether the oracle is a matrix or gates, if both simulate to the same answer?
        <details><summary>Answer</summary>Because it can only optimise what it can see inside. Gates can be decomposed to a chip's native set, reordered, routed around missing connections, and cancelled against neighbours. A matrix admits none of that.</details>
      </div>`,
  },
  {
    num: "06",
    title: "The diffuser",
    file: "ch06_diffuser.py",
    status: "in progress",
    body: `
      <p><b>This chapter is an exercise.</b> Three blank functions in the file, and a
      self-checking runner that reports which blank is next and, on a wrong answer,
      prints what it expected beside what you produced.</p>
      <pre>python ch06_diffuser.py</pre>

      <h2>The idea</h2>
      <p>Reflect every amplitude around the average. The minus sign the oracle left is
      invisible to measurement, but it is <b>not</b> invisible to an average &mdash; it drags the
      average down. Reflecting then throws the winner far up while the losers collapse.</p>
      <p>No quantum code in the file. It's a plain Python list, which is genuinely how the
      amplitudes are stored.</p>

      <h2>The three blanks</h2>
      <pre>def average(amounts):
    """Return the mean of the list.

    You need the total, and how many there are.
    """</pre>
      <pre>def reflect_one(value, avg):
    """Move value to the other side of avg, the same distance away.

    If avg is 10 and value is 7, the answer is 13: it was 3 below, so it
    comes back 3 above. If avg is 10 and value is 12, the answer is 8.
    A value already equal to avg does not move.

    Work the arithmetic out from that description. It is one line.
    """</pre>
      <pre>def diffuse(amounts):
    """Return a NEW list with every amplitude reflected about the average.

    Use the two functions above. Build a new list, don't edit the one you
    were handed.
    """</pre>

      <h2>Syntax you might want</h2>
      <ul>
        <li><code>sum(my_list)</code> adds a list of numbers. <code>len(my_list)</code> counts them.</li>
        <li>Division is <code>/</code> and gives a float: <code>7 / 2</code> is <code>3.5</code>.</li>
        <li>To build a new list in a loop:
          <pre>out = []
for value in amounts:
    out.append(something)
return out</pre></li>
        <li>No comprehensions needed. The expanded loop is what I'd write here anyway.</li>
      </ul>

      <h2>What passing looks like</h2>
      <p>When all three work it runs one extra demo &mdash; 8 labels, winner marked:</p>
      <pre>before: [0.354, ... , -0.354]
after:  [0.177, ... ,  0.885]
winner's chance went from 12.5% to 78.3%</pre>
      <p><b>One round. 12.5% to 78%.</b> That's the diffuser doing the thing the oracle couldn't.</p>
      <p>The worked answer is in <code>ch06_diffuser_answer.py</code> if you get stuck, but the three
      docstrings are the whole spec, and <code>reflect_one</code> really is one line.</p>
      <div class="check">
        <b>Check:</b> After the oracle you have <code>[0.5, 0.5, &minus;0.5, 0.5]</code>. What's the average, and where does each amplitude land?
        <details><summary>Answer</summary>Average 0.25. Reflecting gives <code>[0, 0, 1, 0]</code> &mdash; the three losers sat just above the average so they drop to zero, and the winner sat far below it so it goes to 1.0. That's 100% on the winner after one round.</details>
      </div>`,
  },
  {
    num: "07",
    title: "Grover: repeat, and know when to stop",
    file: "ch07_grover.py",
    status: "locked",
  },
  {
    num: "08",
    title: "On real hardware: Superstaq and Sqale",
    file: "ch08_hardware.py",
    status: "locked",
  },
  {
    num: "09",
    title: "A real compiled oracle: the checker in gates",
    file: "ch09_compiled_checker.py",
    status: "locked",
  },
  {
    num: "A",
    title: "Appendix: entanglement, which Grover never needs",
    file: "appendix_entanglement.py",
    status: "done",
    body: `
      <pre>0: ───H───@───
          │
1: ───────X───</pre>
      <pre>after step 0: 0.707|00&rangle; + 0.707|10&rangle;
after step 1: 0.707|00&rangle; + 0.707|11&rangle;</pre>
      <p>H splits q0 in half; nothing touches q1, so only the first digit varies. Then CNOT says "if q0 is 1, flip q1", applied to each part separately &mdash; <code>|00&rangle;</code> stays, <code>|10&rangle;</code> becomes <code>|11&rangle;</code>. Now the two qubits always agree.</p>
      <p><b>Why it's entangled:</b> try to split <code>[0.707, 0, 0, 0.707]</code> back into one list per qubit. You'd need <code>a&middot;d = 0</code> but also <code>a&middot;c &ne; 0</code> and <code>b&middot;d &ne; 0</code>, and both can't hold. Neither qubit has a state of its own any more. There's only the pair.</p>
      <p><b>Why it's an appendix:</b> Grover doesn't use it. This is the standard hello-world and a fair interview question, but nothing downstream depends on it.</p>
      <div class="check">
        <b>Check:</b> Delete the CNOT. Is the result still entangled?
        <details><summary>Answer</summary>No. Without it you get <code>0.707|00&rangle; + 0.707|10&rangle;</code>, which splits cleanly into <code>[0.707, 0.707] &otimes; [1, 0]</code> &mdash; q0 is in a superposition, q1 is plainly |0&rangle;.</details>
      </div>`,
  },
];
