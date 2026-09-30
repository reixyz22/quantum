"""Chapter 3: marking the winner. One gate puts a minus sign on |111>.

The mark is real in the amplitudes and invisible to any measurement, which
is why the oracle alone finds nothing.
"""
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
