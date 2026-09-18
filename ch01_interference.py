"""Chapter 1: interference. H twice cancels back to where you started."""
import cirq

from qtools import peek


def build_circuit():
    q = cirq.LineQubit(0)
    circuit = cirq.Circuit(
        cirq.H(q),
        cirq.H(q),
    )
    return circuit, (q,)


if __name__ == "__main__":
    circuit, qubits = build_circuit()
    print(circuit)
    peek(circuit)
