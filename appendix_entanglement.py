"""Appendix: entanglement (H then CNOT), which Grover never actually needs.

Kept because it is the standard hello-world and because "can you explain
entanglement" is a fair question. Nothing downstream depends on it.
"""
import cirq

from qtools import peek, sample_locally


def build_circuit():
    q0, q1 = cirq.LineQubit.range(2)
    circuit = cirq.Circuit(
        cirq.H(q0),         # line A: split q0 into half |0⟩, half |1⟩
        cirq.CNOT(q0, q1),  # line B: if q0 is 1, flip q1
    )
    return circuit, (q0, q1)


if __name__ == "__main__":
    circuit, qubits = build_circuit()
    print(circuit)
    peek(circuit)
    sample_locally(circuit, qubits)
