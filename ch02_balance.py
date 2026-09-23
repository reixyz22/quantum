"""Chapter 2: the equal balance state B. One H on every qubit at once."""
import math

import cirq

from qtools import peek, sample_locally

N_QUBITS = 4


def build_circuit(n=N_QUBITS):
    qubits = cirq.LineQubit.range(n)
    circuit = cirq.Circuit(cirq.H.on_each(*qubits))
    return circuit, tuple(qubits)


# Chances first, amounts second. Going the other way is what trips people up.
def predicted(n):
    labels = 2 ** n                     # N: the number of possible answers, not the qubit count
    chance = 1 / labels                 # fair share, and all N of these add to 1
    amount = math.sqrt(chance)          # the amount is the SQUARE ROOT of the chance
    print(f"{n} qubits -> N = 2^{n} = {labels} labels")
    print(f"  chance on each: 1/{labels} = {chance:.4f}   (x{labels} = {chance * labels:.1f})")
    print(f"  amount on each: sqrt({chance:.4f}) = {amount:.3f}   (squares back to {amount ** 2:.4f})")


if __name__ == "__main__":
    circuit, qubits = build_circuit()
    print(circuit)
    predicted(len(qubits))
    peek(circuit)
    sample_locally(circuit, qubits)
