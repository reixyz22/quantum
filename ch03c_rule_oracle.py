"""An oracle built from a RULE, not from a secret string.

Four qubits. The first two are a number `a`, the last two are a number `b`.
The rule is "a times b equals 4". Nowhere in this file do we write down
which label satisfies it.
"""
import numpy as np
import cirq

from qtools import peek, sample_locally


def passes(a, b):
    return a * b == 4


# Walk every possible label and ask the rule about it.
# +1 means "fails, leave it alone". -1 means "passes, flip its sign".
signs = []
for label in range(16):
    bits = format(label, "04b")     # 6 -> "0110"
    a = int(bits[0:2], 2)           # first two bits, read as a number
    b = int(bits[2:4], 2)           # last two bits, read as a number
    if passes(a, b):
        signs.append(-1)
    else:
        signs.append(+1)

oracle_gate = cirq.MatrixGate(np.diag(signs).astype(np.complex128))

q0 = cirq.LineQubit(0)
q1 = cirq.LineQubit(1)
q2 = cirq.LineQubit(2)
q3 = cirq.LineQubit(3)

circuit = cirq.Circuit()
circuit.append(cirq.H(q0))
circuit.append(cirq.H(q1))
circuit.append(cirq.H(q2))
circuit.append(cirq.H(q3))
circuit.append(oracle_gate.on(q0, q1, q2, q3))

peek(circuit)
sample_locally(circuit, (q0, q1, q2, q3), shots=800)
