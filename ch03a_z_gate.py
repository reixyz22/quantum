"""Two different kinds of flip. X flips the bit. Z flips the sign."""
import cirq

from qtools import peek

q = cirq.LineQubit(0)


def show(title, circuit):
    print()
    print(title)
    print(circuit)
    peek(circuit)


# 1. X on |0>. The BIT changes.
x_on_zero = cirq.Circuit()
x_on_zero.append(cirq.X(q))
show("X on |0>", x_on_zero)

# 2. Z on |0>. Nothing happens at all.
z_on_zero = cirq.Circuit()
z_on_zero.append(cirq.Z(q))
show("Z on |0>", z_on_zero)

# 3. Z on |1>. The SIGN changes. The bit does not.
#    (The X is only there to get us to |1> first.)
z_on_one = cirq.Circuit()
z_on_one.append(cirq.X(q))
z_on_one.append(cirq.Z(q))
show("Z on |1>", z_on_one)
