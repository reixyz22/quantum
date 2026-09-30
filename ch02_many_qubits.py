"""Chapter 2: more than one qubit, and why the list of numbers doubles.

Each qubit brings two labels of its own, so n qubits give 2**n labels and
2**n amplitudes. That doubling is the whole reason a quantum computer is
worth building and impossible to simulate at scale.
"""
import math

import cirq

from qtools import peek, sample_locally

N_QUBITS = 3


def doubling() -> None:
    """The doubling in plain arithmetic. No qubits involved."""
    print("one qubit is two numbers:          [a, b]")
    print("another qubit is two more:         [c, d]")
    print("together they are FOUR numbers:    [a*c, a*d, b*c, b*d]")
    print("                                    00   01   10   11")
    print()
    print("Every pair gets multiplied, so every extra qubit doubles the list.")
    print("n qubits -> 2**n labels. This is called the tensor product.")


def predicted(n: int) -> None:
    """What an even split across every label has to look like.

    Chances first, amplitudes second: the amplitude is the square ROOT of
    the chance, and going the other way is what trips people up.
    """
    labels = 2 ** n
    chance = 1 / labels
    amplitude = math.sqrt(chance)
    print(f"{n} qubits -> N = 2^{n} = {labels} labels")
    print(f"  chance on each:    1/{labels} = {chance:.4f}"
          f"   (x{labels} = {chance * labels:.1f})")
    print(f"  amplitude on each: sqrt({chance:.4f}) = {amplitude:.3f}"
          f"   (squares back to {amplitude ** 2:.4f})")


def build_circuit(n: int = N_QUBITS):
    """One H on every qubit. This is Grover's starting line."""
    qubits = cirq.LineQubit.range(n)

    circuit = cirq.Circuit()
    for qubit in qubits:
        circuit.append(cirq.H(qubit))

    return circuit, tuple(qubits)


if __name__ == "__main__":
    doubling()
    print()

    circuit, qubits = build_circuit()
    print(circuit)
    predicted(len(qubits))
    peek(circuit)
    sample_locally(circuit, qubits)
