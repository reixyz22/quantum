"""Chapter 5: aim one sign-flipping gate at one label.

Three blanks. Fill them in, run the file, and it tells you which one is next
and whether your gates do the same job as chapter 4's matrix.

WHY THE DISGUISE. The only sign-flipping gate we have is a controlled Z, and
it fires on exactly one pattern: every qubit reading 1. The winner for 15 is
11101, not 11111. So we X the qubits that should read 0, let the CZ fire, and
X them back. The X gates are a workaround for having one gate with a fixed
trigger, nothing deeper than that.

WHAT THIS IS NOT. This does not translate the checker into gates. It aims a
flip at a label we already looked up, which is chapter 4's cheat wearing
gates instead of a matrix. The real thing is a multiplier plus a comparator,
where nothing in the circuit knows what 3 or 5 are. That is a later chapter.

Pass a target on the command line: python ch05_compiling.py 21

If you get stuck the worked version is in ch05_compiling_answer.py.
"""
from __future__ import annotations

import numpy as np
import cirq

from targets import factor_pair, label_text, qubit_count, register_bits


# ---------------------------------------------------------------------------
# Your three blanks.
# ---------------------------------------------------------------------------

def positions_needing_x(winner_bits: str) -> list[int]:
    zeros = []
    for index, item in enumerate(winner_bits):
        if item == '0':
            zeros.append(index)
    return zeros


def disguise(qubits, winner_bits: str) -> list[cirq.Operation]:
    """One X gate on each qubit that needs disguising.

    Use positions_needing_x above to decide which. An X on a qubit is
    written cirq.X(qubit), and qubits[3] is the fourth qubit.

    Return a list of those X operations. Empty list is fine if there are no
    zeros in the label.
    """
    zeros = positions_needing_x(winner_bits)
    return [cirq.X(qubits[x]) for x in zeros]


def oracle_from_gates(qubits, winner_bits: str) -> cirq.Circuit:
    """Assemble the whole oracle: disguise, fire, undisguise.

    Three appends, in that order. The same disguise list works for putting
    the mask on and taking it off, because two X gates on one qubit cancel.

    controlled_z() below is written for you.
    """
    cir = cirq.Circuit()

    cir.append(disguise(qubits, winner_bits))
    cir.append(controlled_z(qubits))
    cir.append(disguise(qubits, winner_bits))
    return cir




# ---------------------------------------------------------------------------
# Written for you. You don't need to edit below this line.
# ---------------------------------------------------------------------------

def controlled_z(qubits) -> cirq.Operation:
    """Z on the last qubit, but only when every other qubit reads 1."""
    return cirq.Z(qubits[-1]).controlled_by(*qubits[:-1])


def winning_label(target: int) -> str:
    """The label the checker accepts, as a string of 0s and 1s."""
    a, b = factor_pair(target)
    _, b_bits = register_bits(target)
    return label_text((a << b_bits) | b, target)


def oracle_as_matrix(target: int) -> cirq.MatrixGate:
    """Chapter 4's version: a diagonal of +1s with a single -1."""
    winner = int(winning_label(target), 2)

    signs = []
    for label in range(2 ** qubit_count(target)):
        if label == winner:
            signs.append(-1)
        else:
            signs.append(+1)

    return cirq.MatrixGate(np.diag(signs).astype(np.complex128))


def run_checks(extra_target: int | None = None) -> None:
    try:
        positions_needing_x("11101")
    except NotImplementedError:
        print("positions_needing_x() is still blank. Start there.")
        return

    for winner_bits, want in [("11101", [3]), ("1010", [1, 3]), ("1111", []),
                       ("0000", [0, 1, 2, 3])]:
        got = positions_needing_x(winner_bits)
        if list(got) != want:
            print(f"positions_needing_x({winner_bits!r}) gave {got}, expected {want}")
            return
    print("positions_needing_x   ok")

    qubits = cirq.LineQubit.range(5)

    try:
        disguise(qubits, "11101")
    except NotImplementedError:
        print("disguise() is still blank. That one next.")
        return

    got = list(disguise(qubits, "11101"))
    want = [cirq.X(qubits[3])]
    if got != want:
        print(f"disguise(qubits, '11101') gave {got}, expected {want}")
        return
    if list(disguise(qubits, "11111")) != []:
        print("disguise should return an empty list when the label is all 1s")
        return
    print("disguise              ok")

    try:
        oracle_from_gates(qubits, "11101")
    except NotImplementedError:
        print("oracle_from_gates() is still blank. Last one.")
        return

    print("oracle_from_gates     ok, now checking it against the matrix:")
    print()
    targets = [4, 6, 15, 21]
    if extra_target is not None and extra_target not in targets:
        targets.append(extra_target)

    for target in targets:
        n = qubit_count(target)
        wires = cirq.LineQubit.range(n)
        winner_bits = winning_label(target)

        described = cirq.Circuit(oracle_as_matrix(target).on(*wires))
        built = oracle_from_gates(wires, winner_bits)

        same = cirq.allclose_up_to_global_phase(
            cirq.unitary(described), cirq.unitary(built)
        )
        a, b = factor_pair(target)
        gates = len(list(built.all_operations()))
        verdict = "same operation" if same else "DIFFERENT -- something is off"
        print(f"  target {target:>3} ({a} x {b}), winner {winner_bits}: "
              f"{gates} gates, depth {len(built)} -> {verdict}")

    print()
    print("Your gates, for target 15:")
    wires = cirq.LineQubit.range(qubit_count(15))
    print(oracle_from_gates(wires, winning_label(15)))


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        run_checks(int(sys.argv[1]))
    else:
        run_checks()
