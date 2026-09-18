"""Shared tools used by every chapter. The lessons live in the chNN_*.py files."""
import os

import cirq
import cirq_superstaq as css
from dotenv import load_dotenv


# Simulator-only superpower: print the hidden state vector after each step.
# Real hardware can never do this; measuring destroys the superposition.
def peek(circuit):
    sim = cirq.Simulator()
    print("start:        all qubits |0⟩")
    for i, step in enumerate(sim.simulate_moment_steps(circuit)):
        print(f"after step {i}: {cirq.dirac_notation(step.state_vector(), decimals=3)}")


# What you'd actually see: only random bit strings, never the vector.
def sample_locally(circuit, qubits, shots=100):
    measured = circuit + cirq.measure(*qubits, key="m")
    result = cirq.Simulator().run(measured, repetitions=shots)
    print("local counts:", result.histogram(key="m"))


def run_on_superstaq(circuit, qubits, shots=100):
    load_dotenv()
    service = css.Service(api_key=os.getenv("SUPER_STAQ"))
    job = service.create_job(
        circuit + cirq.measure(*qubits),
        repetitions=shots,
        target="ibmq_fez_qpu",
        method="dry-run",  # simulated, no real QPU time used
    )
    print("superstaq counts:", job.counts())
