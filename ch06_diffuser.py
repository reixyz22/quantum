"""Chapter 6: write the diffuser yourself.

Three blanks. Fill them in and run the file; it tells you which ones work and
what it expected. Run it as often as you like.

No cirq in here. This is plain Python on a list of numbers, which is genuinely
how the amplitudes are stored.

If you get stuck the worked answer is in ch06_diffuser_answer.py, but try the
blanks first.
"""
from __future__ import annotations


def average(amounts: list[float]) -> float:
    """Return the mean of the list.

    You need the total, and how many there are.
    """
    raise NotImplementedError("write me")


def reflect_one(value: float, avg: float) -> float:
    """Move `value` to the other side of `avg`, the same distance away.

    If avg is 10 and value is 7, the answer is 13: it was 3 below, so it comes
    back 3 above. If avg is 10 and value is 12, the answer is 8.
    A value already equal to avg does not move.

    Work the arithmetic out from that description. It is one line.
    """
    raise NotImplementedError("write me")


def diffuse(amounts: list[float]) -> list[float]:
    """Return a NEW list with every amplitude reflected about the average.

    Use the two functions above. Build a new list, don't edit the one you
    were handed.
    """
    raise NotImplementedError("write me")


# ---------------------------------------------------------------------------
# Checks. You don't need to edit below this line.
# ---------------------------------------------------------------------------

CASES = [
    (
        "no winner marked, so nothing should move",
        [0.5, 0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5, 0.5],
    ),
    (
        "winner at label 2",
        [0.5, 0.5, -0.5, 0.5],
        [0.0, 0.0, 1.0, 0.0],
    ),
    (
        "winner at label 0",
        [-0.5, 0.5, 0.5, 0.5],
        [1.0, 0.0, 0.0, 0.0],
    ),
    (
        "two qubits, winner at label 3",
        [0.5, 0.5, 0.5, -0.5],
        [0.0, 0.0, 0.0, 1.0],
    ),
]


def close_enough(got, want, slack=1e-9):
    if len(got) != len(want):
        return False
    for i in range(len(got)):
        if abs(got[i] - want[i]) > slack:
            return False
    return True


def run_checks():
    try:
        average([1.0, 3.0])
    except NotImplementedError:
        print("average() is still blank. Start there.")
        return

    got = average([1.0, 3.0])
    if abs(got - 2.0) > 1e-9:
        print(f"average([1.0, 3.0]) gave {got}, expected 2.0")
        return
    print("average           ok")

    try:
        reflect_one(7.0, 10.0)
    except NotImplementedError:
        print("reflect_one() is still blank. That one next.")
        return

    for value, avg, want in [(7.0, 10.0, 13.0), (12.0, 10.0, 8.0), (10.0, 10.0, 10.0)]:
        got = reflect_one(value, avg)
        if abs(got - want) > 1e-9:
            print(f"reflect_one({value}, {avg}) gave {got}, expected {want}")
            return
    print("reflect_one       ok")

    try:
        diffuse([0.5, 0.5, 0.5, 0.5])
    except NotImplementedError:
        print("diffuse() is still blank. Last one.")
        return

    for name, start, want in CASES:
        got = diffuse(start)
        if not close_enough(got, want):
            print(f"diffuse FAILED: {name}")
            print(f"  started with {start}")
            print(f"  you produced {[round(v, 4) for v in got]}")
            print(f"  expected     {want}")
            return
    print("diffuse           ok")

    print()
    print("All three work. Here is what yours does to 8 labels:")
    eight = [0.354, 0.354, 0.354, 0.354, 0.354, 0.354, 0.354, -0.354]
    out = diffuse(eight)
    print(f"  before: {[round(v, 3) for v in eight]}")
    print(f"  after:  {[round(v, 3) for v in out]}")
    winner = out[7]
    print(f"  winner's chance went from {eight[7] ** 2:.1%} to {winner ** 2:.1%}")


if __name__ == "__main__":
    run_checks()
