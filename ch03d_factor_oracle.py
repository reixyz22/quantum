"""Compiling the factoring checker into a circuit that flips one sign.

The checker itself lives in targets.py. This file's only job is turning it
into gates, which is the thing a quantum compiler does.
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


def report(target: int) -> None:
    a_bits, b_bits = register_bits(target)
    print(f"target {target}: register a is {a_bits} bits, b is {b_bits} bits, "
          f"{qubit_count(target)} qubits, {2 ** qubit_count(target)} labels")

    circuit, qubits = build_circuit(target)

    state = cirq.Simulator().simulate(circuit).final_state_vector

    winners = []
    for label in range(len(state)):
        if state[label].real < 0:
            winners.append(label)
            a, b = split_label(label, target)
            print(f"  negative at {label_text(label, target)}  ->  a={a}, b={b}")

    # Measuring can't see those minus signs, so summarise rather than dump
    # all the counts: the winner should be getting an ordinary share.
    shots = 400
    measured = circuit + cirq.measure(*qubits, key="m")
    counts = cirq.Simulator().run(measured, repetitions=shots).histogram(key="m")
    average = shots / len(state)
    for label in winners:
        print(f"  measured {counts[label]} times out of {shots} "
              f"(an average label gets {average:.1f})")


if __name__ == "__main__":
    report(15)
