"""Compiling the factoring checker into a circuit that flips one sign.

The checker itself lives in targets.py. This file's only job is turning it
into gates, which is the thing a quantum compiler does.
"""
import math

import numpy as np
import cirq

from targets import label_text, passes, qubit_count, register_bits, split_label


def build_oracle_gate(target: int) -> cirq.MatrixGate:
    """A gate that flips the sign of every label the checker accepts.

    Caveat, and it matters: this walks all the labels to build the matrix,
    which is the brute-force search Grover is meant to beat. A real compiler
    builds this out of the multiplier's own gates and never enumerates. This
    is a simulator shortcut so we can watch it work.
    """
    signs = []
    for label in range(2 ** qubit_count(target)):
        a, b = split_label(label, target)
        if passes(a, b, target):
            signs.append(-1)
        else:
            signs.append(+1)

    return cirq.MatrixGate(np.diag(signs).astype(np.complex128))


def build_circuit(target: int) -> tuple[cirq.Circuit, tuple[cirq.Qid, ...]]:
    qubits = cirq.LineQubit.range(qubit_count(target))

    circuit = cirq.Circuit()
    for qubit in qubits:
        circuit.append(cirq.H(qubit))
    circuit.append(build_oracle_gate(target).on(*qubits))

    return circuit, tuple(qubits)


def show_amplitudes(state, target: int, per_row: int = 4, cap: int = 64) -> None:
    """Print every label with its amplitude. Marked ones get an arrow."""
    size = len(state)
    if size > cap:
        print()
        print(f"  {size} labels is past the cap of {cap}; raise it to list them")
        return

    print()
    print(f"  all {size} amplitudes:")
    row = "   "
    for label in range(size):
        amplitude = state[label].real
        if amplitude < 0:
            mark = "<"
        else:
            mark = " "
        row += f" {label_text(label, target)} {amplitude:+.3f}{mark}"
        if (label + 1) % per_row == 0:
            print(row)
            row = "   "
    if row.strip():
        print(row)


def show_counts(circuit, qubits, target: int, winners, shots: int = 400) -> None:
    """Measure, then say plainly whether the marked label stood out.

    A marked label should NOT stand out, so eyeballing the number is the wrong
    test: any count will look a bit off. Compare it instead to what a perfectly
    uniform distribution would do. Each label has chance 1/size, so over `shots`
    runs it should land near shots/size, give or take
    sqrt(shots * chance * (1 - chance)). Anything within a few of those is
    ordinary sampling noise and tells you nothing happened.
    """
    size = 2 ** qubit_count(target)
    measured = circuit + cirq.measure(*qubits, key="m")
    counts = cirq.Simulator().run(measured, repetitions=shots).histogram(key="m")

    chance = 1 / size
    expected = shots * chance
    spread = math.sqrt(shots * chance * (1 - chance))

    print()
    print(f"  measured {shots} times. uniform would give every label "
          f"{expected:.1f} +/- {spread:.1f}")
    for label in winners:
        count = counts[label]
        spreads = (count - expected) / spread
        if abs(spreads) < 3:
            verdict = "ordinary"
        else:
            verdict = "STANDS OUT"
        print(f"    {label_text(label, target)} got {count}, which is "
              f"{spreads:+.1f} spreads from expected -> {verdict}")
    print("    the mark is invisible to measurement, which is the whole point")


def report(target: int) -> None:
    a_bits, b_bits = register_bits(target)
    size = 2 ** qubit_count(target)
    print(f"target {target}: register a is {a_bits} bits, b is {b_bits} bits, "
          f"{qubit_count(target)} qubits, {size} labels")

    circuit, qubits = build_circuit(target)
    state = cirq.Simulator().simulate(circuit).final_state_vector

    winners = []
    for label in range(size):
        if state[label].real < 0:
            winners.append(label)
            a, b = split_label(label, target)
            print(f"  marked {label_text(label, target)}  ->  a={a}, b={b}")

    show_amplitudes(state, target)
    show_counts(circuit, qubits, target, winners)


if __name__ == "__main__":
    report(15)
