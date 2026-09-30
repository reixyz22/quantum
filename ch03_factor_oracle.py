"""A factoring oracle you point at a target number. Nothing else to pass.

A label is two numbers side by side: `a` in the first half of the qubits,
`b` in the second half. The rule is "a times b equals the target", with the
trivial factorisations (a=1 or b=1) thrown out and a <= b to kill the mirror
duplicate, so a semiprime has exactly one answer.

The target is written down. The factors never are.
"""
import numpy as np
import cirq



# 5 bits per number is 10 qubits and 1024 labels, which is about where the
# simulator stops being pleasant to wait on.
MAX_BITS = 5


def bits_for(target: int) -> int:
    """How many bits each of the two numbers needs.

    Any non-trivial factor of `target` is at most target // 2, so a register
    that holds target // 2 holds every factor we care about. Derived from the
    target alone and never from its factors: sizing the register to fit the
    real factor would leak how big it is.
    """
    needed = (target // 2).bit_length()
    if needed < 2:
        return 2
    return needed


def split_label(label: int, bits: int) -> tuple[int, int]:
    """Turn a label number into its two halves, as numbers."""
    text = format(label, "0" + str(bits * 2) + "b")
    a = int(text[0:bits], 2)
    b = int(text[bits:], 2)
    return a, b


def passes(a: int, b: int, target: int) -> bool:
    if a <= 1 or b <= 1:
        return False        # 1 x target is not interesting
    if a > b:
        return False        # keep only one of (a,b) and (b,a)
    return a * b == target


def factor_pairs(target: int) -> list[tuple[int, int]]:
    """The (a, b) pairs the rule accepts. Plain arithmetic, no qubits.

    This is for choosing and reporting on targets. The oracle does not use it.
    """
    pairs = []
    for a in range(2, target + 1):
        if a * a > target:
            break
        if target % a == 0:
            b = target // a
            if passes(a, b, target):
                pairs.append((a, b))
    return pairs


def unique_targets(max_bits: int = MAX_BITS) -> list[int]:
    """Targets with exactly one answer that fits the register. Safe to offer."""
    biggest = 2 ** max_bits - 1
    good = []
    for target in range(4, biggest * biggest + 1):
        pairs = factor_pairs(target)
        if len(pairs) != 1:
            continue
        if bits_for(target) > max_bits:
            continue
        good.append(target)
    return good


def nearest_unique_target(wanted: int, max_bits: int = MAX_BITS) -> int:
    """Closest target to `wanted` that has exactly one answer."""
    best = None
    for target in unique_targets(max_bits):
        if best is None or abs(target - wanted) < abs(best - wanted):
            best = target
    return best


def build_oracle_gate(target: int) -> cirq.MatrixGate:
    """A gate that flips the sign of every label the rule accepts.

    Caveat, and it matters: this walks all the labels to build the matrix,
    which is the brute-force search Grover is meant to beat. A real compiler
    builds this out of the multiplier's own gates and never enumerates. This
    is a simulator shortcut so we can watch it work.
    """
    bits = bits_for(target)

    signs = []
    for label in range(2 ** (bits * 2)):
        a, b = split_label(label, bits)
        if passes(a, b, target):
            signs.append(-1)
        else:
            signs.append(+1)

    return cirq.MatrixGate(np.diag(signs).astype(np.complex128))


def build_circuit(target: int) -> tuple[cirq.Circuit, tuple[cirq.Qid, ...]]:
    bits = bits_for(target)
    qubits = cirq.LineQubit.range(bits * 2)

    circuit = cirq.Circuit()
    for qubit in qubits:
        circuit.append(cirq.H(qubit))
    circuit.append(build_oracle_gate(target).on(*qubits))

    return circuit, tuple(qubits)


def report(target: int) -> None:
    bits = bits_for(target)
    print(f"target {target}: {bits} bits each, {bits * 2} qubits, "
          f"{2 ** (bits * 2)} labels")

    circuit, qubits = build_circuit(target)

    state = cirq.Simulator().simulate(circuit).final_state_vector

    winners = []
    for label in range(len(state)):
        if state[label].real < 0:
            winners.append(label)
            a, b = split_label(label, bits)
            text = format(label, "0" + str(bits * 2) + "b")
            print(f"  negative at {text}  ->  a={a}, b={b}")

    # Measuring can't see those minus signs, so summarise rather than dump
    # all the counts: the winner should be getting an ordinary share.
    shots = 400
    measured = circuit + cirq.measure(*qubits, key="m")
    counts = cirq.Simulator().run(measured, repetitions=shots).histogram(key="m")
    average = shots / len(state)
    for label in winners:
        print(f"  measured {counts[label]} times out of {shots} "
              f"(an average label gets {average:.1f})")


if __name__ == "__main__":
    print("targets with exactly one answer:")
    print(" ", unique_targets())
    print()

    report(15)
    print()

    wanted = 13
    print(f"{wanted} has no clean factorisation; "
          f"nearest good target is {nearest_unique_target(wanted)}")
