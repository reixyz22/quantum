"""Chapter 3: the oracle. One new gate, which puts a minus sign on |111>."""
import cirq

from qtools import peek, sample_locally

q0 = cirq.LineQubit(0)
q1 = cirq.LineQubit(1)
q2 = cirq.LineQubit(2)

circuit = cirq.Circuit()
circuit.append(cirq.H(q0))
circuit.append(cirq.H(q1))
circuit.append(cirq.H(q2))
circuit.append(cirq.Z(q2).controlled_by(q0, q1))

print(circuit)
peek(circuit)
sample_locally(circuit, (q0, q1, q2), shots=800)
