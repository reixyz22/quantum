# quantum

Learning Grover's search algorithm from scratch in [Cirq](https://quantumai.google/cirq) and Infleqtion's [Superstaq](https://superstaq.readthedocs.io/), one idea per chapter, then explaining it on a step-through website.

## Layout

```
qtools.py              shared tools: peek (show the hidden state vector), sample_locally, run_on_superstaq
ch00_bell.py           amounts, labels, entanglement (H + CNOT)
ch01_interference.py   interference: H twice cancels back to the start
web/                   static site (chapters + flashcards), deployed on Vercel
```

Each new concept gets its own `chNN_topic.py`. Every chapter exposes `build_circuit() -> (circuit, qubits)` so the site can export all chapters the same way.

## Run a chapter

```bash
python -m venv .venv
.venv\Scripts\activate
pip install cirq cirq-superstaq python-dotenv
python ch01_interference.py
```

`run_on_superstaq` reads a `SUPER_STAQ` API key from `.env` (gitignored) and uses `method="dry-run"`, so no real QPU time is spent.

## Website

Plain HTML/CSS/JS with no build step. Content lives in `web/data/chapters.js` and `web/data/flashcards.js`.

- Local: open `web/index.html` in a browser.
- Vercel: import the repo, set **Root Directory** to `web`, Framework Preset **Other**, no build command.
