"""Chapter 2: the equal balance state B. One H on every qubit at once."""
import math

import cirq

from qtools import peek, sample_locally

N_QUBITS = 3


def build_circuit(n=N_QUBITS):
    qubits = cirq.LineQubit.range(n)
    circuit = cirq.Circuit(cirq.H.on_each(*qubits))
    return circuit, tuple(qubits)


# The amount Grover's math predicts on every label: 1/sqrt(N).
def predicted(n):
    size = 2 ** n
    amount = 1 / math.sqrt(size)
    print(f"{n} qubits -> {size} labels, each amount 1/sqrt({size}) = {amount:.3f}")
    print(f"each chance: {amount:.3f}^2 = {amount ** 2:.4f}  ({size} x that = 1.0)")


if __name__ == "__main__":
    circuit, qubits = build_circuit()
    print(circuit)
    predicted(len(qubits))
    peek(circuit)
    sample_locally(circuit, qubits)
