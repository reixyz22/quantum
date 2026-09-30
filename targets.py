"""Picking a factoring puzzle for Grover to solve. No quantum code in here.

Two words from classical computing that this file leans on:

  register  a named group of qubits treated together as one number. We use
            two: one holding `a`, one holding `b`. They are different sizes,
            for reasons explained at register_bits below.
  label     one possible reading of both registers together, like 01101.
            n qubits give 2**n of them. The textbook name is a "basis
            state"; label is just shorter to say.

Targets are semiprimes: a product of exactly two primes, like 15 = 3 x 5 or
9 = 3 x 3. That guarantees exactly one answer, which keeps Grover's round
count fixed and predictable.

Imports no cirq on purpose. If it ever needs to, something has drifted.
"""
from __future__ import annotations   # lets `| None` work on Python 3.9

from math import isqrt

# 10 qubits is 1024 labels, which is about where the simulator stops being
# pleasant to wait on.
MAX_QUBITS = 10


def is_prime(n: int) -> bool:
    if n < 2:
        return False
    for divisor in range(2, isqrt(n) + 1):
        if n % divisor == 0:
            return False
    return True


def factor_pair(target: int) -> tuple[int, int] | None:
    """The two primes that multiply to `target`, smaller first.

    Returns None if there aren't exactly two, which rules out primes (13),
    prime cubes (8 = 2 x 4) and anything with several factorisations
    (12 = 2 x 6 and 3 x 4).
    """
    for a in range(2, isqrt(target) + 1):
        if target % a != 0:
            continue
        b = target // a
        if is_prime(a) and is_prime(b):
            return a, b
        return None     # smallest factor found, but not a clean pair
    return None         # prime: no factor at or below the square root


def register_bits(target: int) -> tuple[int, int]:
    """How many bits each register needs: (for a, for b).

    The two registers are deliberately different sizes.

    We require a <= b, so `a` can never be larger than the square root of
    the target. For 62 that caps `a` at 7, which is 3 bits, not the 5 that
    `b` needs to hold 31. Sizing both registers for the worst case would
    give away 2 qubits and quadruple the search space for nothing.

    `b` is bounded the other way: the smallest `a` can be is 2, so `b` is at
    most target // 2.

    Both bounds come from the target alone, never from its factors. Sizing a
    register to fit the real factor would leak how big that factor is.
    """
    a_bits = isqrt(target).bit_length()
    b_bits = (target // 2).bit_length()
    return a_bits, b_bits


def qubit_count(target: int) -> int:
    a_bits, b_bits = register_bits(target)
    return a_bits + b_bits


def label_text(label: int, target: int) -> str:
    """The label as the string of 0s and 1s that peek would print."""
    return format(label, "0" + str(qubit_count(target)) + "b")


def split_label(label: int, target: int) -> tuple[int, int]:
    """Read a label back as the two numbers its registers hold."""
    a_bits, _ = register_bits(target)
    text = label_text(label, target)
    a = int(text[0:a_bits], 2)
    b = int(text[a_bits:], 2)
    return a, b


def passes(a: int, b: int, target: int) -> bool:
    """The checker. This is the predicate the oracle gets compiled from."""
    if a <= 1 or b <= 1:
        return False        # 1 x target is not interesting
    if a > b:
        return False        # keep only one of (a,b) and (b,a)
    return a * b == target


def playable_targets(max_qubits: int = MAX_QUBITS) -> list[int]:
    """Semiprimes whose two registers fit inside `max_qubits` qubits."""
    good = []
    target = 4
    while True:
        if qubit_count(target) > max_qubits:
            break
        if factor_pair(target) is not None:
            good.append(target)
        target += 1
    return good


def nearest_playable_target(wanted: int, max_qubits: int = MAX_QUBITS) -> int:
    choices = playable_targets(max_qubits)
    if not choices:
        raise ValueError(f"no playable target fits in {max_qubits} qubits")

    best = choices[0]
    for target in choices:
        if abs(target - wanted) < abs(best - wanted):
            best = target
    return best


if __name__ == "__main__":
    print(f"semiprimes playable in {MAX_QUBITS} qubits or fewer:")
    print("target  answer    a bits  b bits  qubits  labels")
    for target in playable_targets():
        a, b = factor_pair(target)
        a_bits, b_bits = register_bits(target)
        total = a_bits + b_bits
        print(f"{target:>6}  {a:>2} x {b:<3}  {a_bits:>6}  {b_bits:>6}"
              f"  {total:>6}  {2 ** total:>6}")

    print()
    for wanted in (13, 17, 12, 50, 200):
        print(f"  {wanted} -> {nearest_playable_target(wanted)}")
