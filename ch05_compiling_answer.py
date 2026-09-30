"""Chapter 5, worked answer: from a matrix to gates a chip could run.

Build the same oracle twice, then prove the two agree.

The matrix version in ch03d is a description: "put a minus here". It is not
something a chip could run. This file builds the same thing out of gates a
chip actually has, and then checks the two are the same operation.

Checking two circuits agree by comparing their unitaries is the standard way
to test a compiler pass on a small circuit.
"""
import numpy as np
import cirq

from targets import factor_pair, label_text, qubit_count, register_bits


def winning_label(target: int) -> int:
    """The label the checker accepts, as a number.

    This peeks at the answer, which is the whole point of the caveat below.
    """
    a, b = factor_pair(target)
    a_bits, b_bits = register_bits(target)
    return (a << b_bits) | b


def oracle_as_matrix(target: int) -> cirq.MatrixGate:
    """The description: a diagonal of +1s with a single -1."""
    size = 2 ** qubit_count(target)

    signs = []
    for label in range(size):
        if label == winning_label(target):
            signs.append(-1)
        else:
            signs.append(+1)

    return cirq.MatrixGate(np.diag(signs).astype(np.complex128))


def oracle_as_gates(target: int, qubits) -> cirq.Circuit:
    """The same operation, built from X and a controlled Z.

    The controlled Z only fires when every qubit reads 1, so we X the qubits
    that are supposed to read 0, let it fire, then X them back.
    """
    text = label_text(winning_label(target), target)

    disguise = []
    for position in range(len(text)):
        if text[position] == "0":
            disguise.append(cirq.X(qubits[position]))

    controls = qubits[:-1]
    target_qubit = qubits[-1]
    controlled_z = cirq.Z(target_qubit).controlled_by(*controls)

    circuit = cirq.Circuit()
    circuit.append(disguise)
    circuit.append(controlled_z)
    circuit.append(disguise)
    return circuit


def compare(target: int) -> None:
    n = qubit_count(target)
    qubits = cirq.LineQubit.range(n)

    described = cirq.Circuit(oracle_as_matrix(target).on(*qubits))
    built = oracle_as_gates(target, qubits)

    same = cirq.allclose_up_to_global_phase(
        cirq.unitary(described),
        cirq.unitary(built),
    )

    print(f"target {target}: {n} qubits, winner "
          f"{label_text(winning_label(target), target)} "
          f"= {factor_pair(target)[0]} x {factor_pair(target)[1]}")
    print(f"  matrix version:  1 gate, not runnable on hardware")
    print(f"  gate version:    {len(list(built.all_operations()))} gates, "
          f"depth {len(built)}")
    print(f"  same operation:  {same}")


if __name__ == "__main__":
    for target in (4, 6, 15, 21):
        compare(target)
        print()

    print("the gate version, for 15:")
    qubits = cirq.LineQubit.range(qubit_count(15))
    print(oracle_as_gates(15, qubits))
