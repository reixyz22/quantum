"""Chapter 3: the oracle. Flip one label's sign without changing any chances."""
import cirq

from qtools import peek, sample_locally

SECRET = "101"


# The controlled Z only fires when every qubit reads 1. So: X the qubits that
# are supposed to read 0, let it fire, then X them back. Net effect is a sign
# flip on exactly the secret label and nothing else.
def oracle(qubits, secret):
    flips = [cirq.X(q) for q, bit in zip(qubits, secret) if bit == "0"]
    return cirq.Circuit(
        flips,
        cirq.Z(qubits[-1]).controlled_by(*qubits[:-1]),
        flips,
    )


def build_circuit(secret=SECRET):
    qubits = cirq.LineQubit.range(len(secret))
    circuit = cirq.Circuit(cirq.H.on_each(*qubits)) + oracle(qubits, secret)
    return circuit, tuple(qubits)


if __name__ == "__main__":
    circuit, qubits = build_circuit()
    print(circuit)
    peek(circuit)
    print(f"\nsecret was {SECRET!r}. The counts below should still look flat:")
    sample_locally(circuit, qubits, shots=800)
