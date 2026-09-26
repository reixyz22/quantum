"""Ch04, first rung: the diffuser as plain arithmetic. No quantum here at all.

Four labels, so four amounts. Label 2 is the winner.
"""

amounts = [0.5, 0.5, 0.5, 0.5]
print("start:          ", amounts)

# The oracle from Ch03: put a minus sign on the winner.
amounts[2] = -amounts[2]
print("after oracle:   ", amounts)

# The diffuser: reflect every amount around the average.
total = 0
for value in amounts:
    total = total + value
average = total / len(amounts)
print("average:        ", average)

new_amounts = []
for value in amounts:
    reflected = 2 * average - value
    new_amounts.append(reflected)
print("after diffuser: ", new_amounts)
