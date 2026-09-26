"""A factoring oracle you can point at any target number.

The label is two numbers side by side: `a` in the first half of the qubits,
`b` in the second half. The rule is "a times b equals the target", with the
trivial factorisations (a=1 or b=1) thrown out and a <= b to kill the mirror
duplicate, so a semiprime has exactly one answer.

The target is written down. The factors never are.
"""
import numpy as np
import cirq

from qtools import sample_locally


def split_label(label, bits):
    """Turn a label number into its two halves, as numbers."""
    text = format(label, "0" + str(bits * 2) + "b")
    a = int(text[0:bits], 2)
    b = int(text[bits:], 2)
    return a, b


def passes(a, b, target):
    if a <= 1 or b <= 1:
        return False        # 1 x target is not interesting
    if a > b:
        return False        # keep only one of (a,b) and (b,a)
    return a * b == target


def winning_labels(target, bits):
    """Every label the rule accepts. Used to report, not by the oracle."""
    winners = []
    for label in range(2 ** (bits * 2)):
        a, b = split_label(label, bits)
        if passes(a, b, target):
            winners.append(label)
    return winners


def unique_targets(bits):
    """Targets with exactly one answer. These are the safe ones to offer."""
    biggest = 2 ** bits - 1
    good = []
    for target in range(2, biggest * biggest + 1):
        if len(winning_labels(target, bits)) == 1:
            good.append(target)
    return good


def nearest_unique_target(wanted, bits):
    """Closest target to `wanted` that has exactly one answer."""
    best = None
    for target in unique_targets(bits):
        if best is None or abs(target - wanted) < abs(best - wanted):
            best = target
    return best


def build_oracle_gate(target, bits):
    """A gate that flips the sign of every label the rule accepts.

    Caveat, and it matters: this walks all 2^(2*bits) labels to build the
    matrix, which is the brute-force search Grover is meant to beat. A real
    compiler builds this out of the multiplier's own gates and never
    enumerates. This is a simulator shortcut so we can watch it work.
    """
    signs = []
    for label in range(2 ** (bits * 2)):
        a, b = split_label(label, bits)
        if passes(a, b, target):
            signs.append(-1)
        else:
            signs.append(+1)
    return cirq.MatrixGate(np.diag(signs).astype(np.complex128))


def build_circuit(target, bits):
    qubits = cirq.LineQubit.range(bits * 2)

    circuit = cirq.Circuit()
    for qubit in qubits:
        circuit.append(cirq.H(qubit))
    circuit.append(build_oracle_gate(target, bits).on(*qubits))

    return circuit, tuple(qubits)


def report(target, bits):
    print(f"target {target}, {bits} bits per number, {2 ** (bits * 2)} labels")

    circuit, qubits = build_circuit(target, bits)

    state = cirq.Simulator().simulate(circuit).final_state_vector
    for label in range(len(state)):
        if state[label].real < 0:
            a, b = split_label(label, bits)
            text = format(label, "0" + str(bits * 2) + "b")
            print(f"  negative at {text}  ->  a={a}, b={b}")

    sample_locally(circuit, qubits, shots=400)


if __name__ == "__main__":
    print("targets with exactly one answer at 3 bits:")
    print(" ", unique_targets(3))
    print()

    report(15, 3)
    print()

    wanted = 13
    safe = nearest_unique_target(wanted, 3)
    print(f"{wanted} has no clean factorisation here; nearest good target is {safe}")
