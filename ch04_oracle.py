"""Chapter 4: an oracle built from a rule, not from a stored answer.

The rule is "a times b equals the target", and it lives in targets.py. The
winning label is never written down anywhere: it falls out of asking the
rule about every label.

Start with target 4, where a=2 and b=2 and there are only 16 labels, then
look at 15.
"""
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
        row += f" {label_text(label, target)} {amplitude:+.3f}"
        if (label + 1) % per_row == 0:
            print(row)
            row = "   "
    if row.strip():
        print(row)


def report(target: int) -> None:
    a_bits, b_bits = register_bits(target)
    size = 2 ** qubit_count(target)
    print(f"target {target}: register a is {a_bits} bits, b is {b_bits} bits, "
          f"{qubit_count(target)} qubits, {size} labels")

    circuit, qubits = build_circuit(target)
    state = cirq.Simulator().simulate(circuit).final_state_vector

    for label in range(size):
        if state[label].real < 0:
            a, b = split_label(label, target)
            print(f"  marked {label_text(label, target)}  ->  a={a}, b={b}")

    show_amplitudes(state, target)


if __name__ == "__main__":
    report(4)
    print()
    report(15)
