"""Choosing and describing a factoring puzzle. No quantum anything in here.

This is the classical side: which target numbers make a good puzzle, how big
a register one needs, and how to read a label back as two numbers. The web
app's buttons and any API around them come from this file.

Deliberately imports no cirq. If it ever needs to, something has drifted.
"""

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


def label_text(label: int, bits: int) -> str:
    """The label as the string of 0s and 1s that peek would print."""
    return format(label, "0" + str(bits * 2) + "b")


def passes(a: int, b: int, target: int) -> bool:
    """The checker. This is the predicate the oracle gets compiled from."""
    if a <= 1 or b <= 1:
        return False        # 1 x target is not interesting
    if a > b:
        return False        # keep only one of (a,b) and (b,a)
    return a * b == target


def factor_pairs(target: int) -> list[tuple[int, int]]:
    """The (a, b) pairs the checker accepts. Plain divisor arithmetic."""
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
    """Targets with exactly one answer that fits the register.

    These are the safe ones to put on a button. Everything else either has
    no answer (a prime) or several (12 is 2x6 and 3x4), and both of those
    change how many rounds Grover needs.
    """
    biggest = 2 ** max_bits - 1
    good = []
    for target in range(4, biggest * biggest + 1):
        if len(factor_pairs(target)) != 1:
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


if __name__ == "__main__":
    print("targets with exactly one answer:")
    print(" ", unique_targets())
    for wanted in (13, 17, 12, 50):
        print(f"  {wanted} -> {nearest_unique_target(wanted)}")
