"""Chapter 1: amplitudes, and why they are allowed to be negative.

One qubit the whole way through, so there are only ever two labels and two
numbers. Everything later is this with a longer list.
"""
import cirq

from qtools import peek

q = cirq.LineQubit(0)


def show(title: str, circuit: cirq.Circuit) -> None:
    print()
    print(title)
    print(circuit)
    peek(circuit)


# 1. H splits |0> evenly. 0.707 squared is 0.5, so it is a genuine 50/50.
h_once = cirq.Circuit()
h_once.append(cirq.H(q))
show("H on |0>: an even split", h_once)

# 2. X flips the BIT. 0 becomes 1.
x_gate = cirq.Circuit()
x_gate.append(cirq.X(q))
show("X on |0>: the bit changes", x_gate)

# 3. Z does nothing at all to a 0.
z_on_zero = cirq.Circuit()
z_on_zero.append(cirq.Z(q))
show("Z on |0>: nothing happens", z_on_zero)

# 4. Z on a 1 flips the SIGN. The bit does not move.
#    The X is only there to get us to |1> first.
z_on_one = cirq.Circuit()
z_on_one.append(cirq.X(q))
z_on_one.append(cirq.Z(q))
show("Z on |1>: the sign changes, the bit does not", z_on_one)

# 5. H twice lands you back at |0>, dead certain.
#    A coin flipped twice cannot do that. This can, because one of the two
#    amplitudes was negative and they cancelled.
h_twice = cirq.Circuit()
h_twice.append(cirq.H(q))
h_twice.append(cirq.H(q))
show("H twice: back where we started, because amplitudes cancel", h_twice)
