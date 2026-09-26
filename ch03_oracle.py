"""Chapter 3: the oracle. Put a minus sign on one label, change no chances."""
import cirq

from qtools import peek, sample_locally


def build_oracle(qubits, secret):
    """Return the gates that flip the sign of exactly the `secret` label.

    `secret` is a string of 0s and 1s, one character per qubit. "101" means
    q0 reads 1, q1 reads 0, q2 reads 1.
    """

    # The only sign-flipping gate we have fires when EVERY qubit reads 1.
    # So first we find the qubits that are supposed to read 0 in the secret.
    qubits_that_should_read_zero = []
    for position in range(len(secret)):
        qubit = qubits[position]
        bit = secret[position]
        if bit == "0":
            qubits_that_should_read_zero.append(qubit)

    # An X gate on each of those turns the secret into all-1s: a disguise.
    disguise = []
    for qubit in qubits_that_should_read_zero:
        disguise.append(cirq.X(qubit))

    # The gate that does the real work. Z flips a sign. controlled_by says
    # "only do it when all of these other qubits read 1".
    all_qubits_except_the_last = qubits[:-1]
    last_qubit = qubits[-1]
    controlled_z = cirq.Z(last_qubit).controlled_by(*all_qubits_except_the_last)

    # Take the disguise back off. The same X gates undo themselves: X twice
    # on a qubit is the same as doing nothing.
    oracle = cirq.Circuit()
    oracle.append(disguise)
    oracle.append(controlled_z)
    oracle.append(disguise)
    return oracle


def build_circuit(secret):
    qubits = cirq.LineQubit.range(len(secret))

    circuit = cirq.Circuit()
    for qubit in qubits:
        circuit.append(cirq.H(qubit))

    circuit.append(build_oracle(qubits, secret))
    return circuit, tuple(qubits)


if __name__ == "__main__":
    secret = "111"

    circuit, qubits = build_circuit(secret)
    print(circuit)
    peek(circuit)
    print(f"\nsecret was {secret!r}. The counts below should still look flat:")
    sample_locally(circuit, qubits, shots=800)
