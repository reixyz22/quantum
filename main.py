from dotenv import load_dotenv
import os
import cirq
import cirq_superstaq as css


def build_circuit():
    q0, q1 = cirq.LineQubit.range(2)
    circuit = cirq.Circuit(
        cirq.H(q0),         # line A
        cirq.CNOT(q0, q1),  # line B
    )
    return circuit, (q0, q1)


# Simulator-only superpower: print the hidden state vector after each step.
def peek(circuit):
    sim = cirq.Simulator()
    print("start:        |00⟩")
    for i, step in enumerate(sim.simulate_moment_steps(circuit)):
        print(f"after step {i}: {cirq.dirac_notation(step.state_vector(), decimals=3)}")


# What you'd actually see: only random bit strings, never the vector.
def sample_locally(circuit, qubits, shots=100):
    measured = circuit + cirq.measure(*qubits, key="m")
    result = cirq.Simulator().run(measured, repetitions=shots)
    print("local counts:", result.histogram(key="m"))


def run_on_superstaq(circuit, qubits, api_key):
    service = css.Service(api_key=api_key)
    job = service.create_job(
        circuit + cirq.measure(*qubits),
        repetitions=100,
        target="ibmq_fez_qpu",
        method="dry-run",  # simulated, no real QPU time used
    )
    print("superstaq counts:", job.counts())


if __name__ == "__main__":
    load_dotenv()
    circuit, qubits = build_circuit()
    print(circuit)
    peek(circuit)
    sample_locally(circuit, qubits)
    run_on_superstaq(circuit, qubits, os.getenv("SUPER_STAQ"))