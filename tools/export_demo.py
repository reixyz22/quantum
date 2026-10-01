"""Run Grover in Cirq for each card in the demo's hand, and save every frame.

Every bar on the demo page is a number Cirq produced. This script builds the
real circuit (H on every qubit, then oracle and diffuser over and over),
steps through it with simulate_moment_steps, and writes each state vector to
web/data/demo.js. Nothing in the browser computes amplitudes; it only draws
what this file recorded.

The oracle is chapter 4's: it checks the rule a * b == target and never has
the factors written down. The diffuser is applied as its matrix,
2|s><s| - I, which is the same reflect-about-the-average operation chapter 6
builds by hand. Its gate-level form is left for later.

It also records what compiling the oracle costs, per card: the register
sizing, chapter 5's gate version, that circuit lowered to CZ plus single-qubit
gates, and the SWAPs needed to route it onto a chip shaped like a line. Each
is measured twice, once with the registers sized by their bounds and once
with both registers full size, so the demo can show what one qubit buys.

    python tools/export_demo.py
"""
from __future__ import annotations

import json
import math
import os
import sys
import warnings

import networkx as nx
import numpy as np
import cirq

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)

from targets import factor_pair, label_text, qubit_count, register_bits  # noqa: E402
from ch04_oracle import build_oracle_gate  # noqa: E402
from ch05_compiling import oracle_from_gates  # noqa: E402

# Semiprimes made of two DIFFERENT primes, the shape of an RSA key.
HAND = [6, 10, 15, 21, 35]

OUT = os.path.join(ROOT, "web", "data", "demo.js")


def diffuser_gate(n: int) -> cirq.MatrixGate:
    """Reflect every amplitude about the average, written as a matrix."""
    size = 2 ** n
    even = np.full(size, 1 / math.sqrt(size))
    matrix = 2 * np.outer(even, even) - np.eye(size)
    return cirq.MatrixGate(matrix.astype(np.complex128))


def line_chip(n: int) -> nx.Graph:
    """A chip where each qubit can only interact with its neighbours in a row."""
    chip = nx.Graph()
    for i in range(n - 1):
        chip.add_edge(cirq.LineQubit(i), cirq.LineQubit(i + 1))
    return chip


def oracle_cost(n: int, winner_bits: str) -> dict:
    """Chapter 5's oracle, then what it becomes once it's compiled for a chip."""
    qubits = cirq.LineQubit.range(n)
    written = oracle_from_gates(qubits, winner_bits)
    native = cirq.optimize_for_target_gateset(written, gateset=cirq.CZTargetGateset())
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        routed, _, _ = cirq.RouteCQC(line_chip(n)).route_circuit(native)
    return {
        "qubits": n,
        "gates": len(list(written.all_operations())),
        "depth": len(written),
        "diagram": str(written),
        "nativeOps": len(list(native.all_operations())),
        "cz": sum(1 for op in native.all_operations() if len(op.qubits) == 2),
        "nativeDepth": len(native),
        "swaps": sum(1 for op in routed.all_operations() if op.gate == cirq.SWAP),
    }


def best_rounds(size: int) -> int:
    return math.floor(math.pi / (4 * math.asin(1 / math.sqrt(size))))


def compile_report(target: int, a: int, b: int) -> dict:
    full = (target // 2).bit_length()          # what each register needs if sized naively
    naive_bits = format(a, f"0{full}b") + format(b, f"0{full}b")
    ours = oracle_cost(qubit_count(target), label_text(winning_label(target), target))
    naive = oracle_cost(2 * full, naive_bits)
    ours["rounds"] = best_rounds(2 ** ours["qubits"])
    naive["rounds"] = best_rounds(2 ** naive["qubits"])
    naive.pop("diagram")
    return {
        "isqrt": math.isqrt(target),
        "half": target // 2,
        "ours": ours,
        "naive": naive,
    }


def winning_label(target: int) -> int:
    a, b = factor_pair(target)
    _, b_bits = register_bits(target)
    return (a << b_bits) | b


def run(target: int) -> dict:
    n = qubit_count(target)
    size = 2 ** n
    a, b = factor_pair(target)
    a_bits, b_bits = register_bits(target)
    winner = winning_label(target)

    # Enough rounds to go past the best one and come back down, so the
    # overshoot is something you can actually watch.
    theta = math.asin(1 / math.sqrt(size))
    planned_best = math.floor(math.pi / (4 * theta))
    rounds = 2 * planned_best + 2

    qubits = cirq.LineQubit.range(n)
    oracle = build_oracle_gate(target).on(*qubits)
    diffuse = diffuser_gate(n).on(*qubits)

    circuit = cirq.Circuit()
    circuit.append(cirq.H.on_each(*qubits))
    for _ in range(rounds):
        circuit.append(oracle, strategy=cirq.InsertStrategy.NEW)
        circuit.append(diffuse, strategy=cirq.InsertStrategy.NEW)

    start = np.zeros(size)
    start[0] = 1.0
    frames = [start]
    # complex128: the default 32-bit floats drift visibly over many rounds.
    simulator = cirq.Simulator(dtype=np.complex128)
    for step in simulator.simulate_moment_steps(circuit):
        frames.append(np.real(step.state_vector()))

    # Sanity checks on what Cirq gave back, before anything ships.
    for frame in frames:
        total = float(np.sum(frame ** 2))
        assert abs(total - 1) < 1e-6, f"{target}: chances sum to {total}"
    marked = [i for i in range(size) if frames[2][i] < 0]
    assert marked == [winner], f"{target}: oracle marked {marked}, expected {winner}"

    # The best round is read off the simulation, not the formula.
    chances = [float(frames[2 * r + 1][winner] ** 2) for r in range(rounds + 1)]
    best = max(range(rounds + 1), key=lambda r: chances[r])
    assert chances[best] > 0.9, f"{target}: best chance only {chances[best]:.3f}"

    return {
        "target": target,
        "a": a,
        "b": b,
        "n": n,
        "N": size,
        "aBits": a_bits,
        "bBits": b_bits,
        "winner": winner,
        "winnerBits": label_text(winner, target),
        "theta": theta,
        "best": best,
        "rounds": rounds,
        "chances": [round(c, 6) for c in chances],
        "compile": compile_report(target, a, b),
        "frames": [[round(float(v), 5) for v in frame] for frame in frames],
    }


def main() -> None:
    cards = [run(target) for target in HAND]

    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("// Generated by tools/export_demo.py. Do not edit by hand.\n")
        f.write("// Every number here is a Cirq state vector amplitude.\n")
        f.write("window.DEMO = ")
        json.dump({"cards": cards}, f, separators=(",", ":"))
        f.write(";\n")

    print(f"wrote {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT) // 1024} KB)")
    print()
    print("target  answer  qubits  labels  best round  chance   blind-guess avg")
    for card in cards:
        print(f"{card['target']:>6}  {card['a']:>2} x {card['b']:<2}"
              f"  {card['n']:>6}  {card['N']:>6}  {card['best']:>10}"
              f"  {card['chances'][card['best']]:>6.1%}   {card['N'] // 2:>8}")
    print()
    print("target  oracle CZ (ours / naive)   SWAPs on a line chip   CZ across the whole run")
    for card in cards:
        o, v = card["compile"]["ours"], card["compile"]["naive"]
        print(f"{card['target']:>6}  {o['cz']:>9} / {v['cz']:<9}"
              f"  {o['swaps']:>9} / {v['swaps']:<9}"
              f"  {o['cz'] * o['rounds']:>9} / {v['cz'] * v['rounds']}")


if __name__ == "__main__":
    main()
