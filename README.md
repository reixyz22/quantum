# quantum

Learning Grover's search algorithm from scratch in [Cirq](https://quantumai.google/cirq) and Infleqtion's [Superstaq](https://superstaq.readthedocs.io/), one idea per chapter, then explaining it on a step-through website.

## Layout

```
qtools.py                 shared tools: peek (show the hidden state vector), sample_locally
targets.py                classical side: which semiprimes make a good puzzle (no cirq)

ch01_amplitudes.py        amplitudes and signs; X flips the bit, Z flips the sign
ch02_many_qubits.py       the tensor product, 2**n labels, the even split
ch03_marking.py           a controlled Z marks one label, invisibly
ch04_oracle.py            an oracle built from a rule, pointed at any semiprime
ch05_compiling.py         matrix vs gates, and checking a compile was correct
ch06_diffuser.py          exercise: write the diffuser (answer in _answer.py)
appendix_entanglement.py  Bell state, off the critical path

web/                      site source (chapters + flashcards)
tools/build_site.mjs      assembles web/ into dist/ and stamps the commit
dist/                     build output, gitignored, what Vercel serves
```

One idea per chapter, one file per chapter. `web/data/chapters.js` keeps `num` and `file` as separate fields so the curriculum order and the filenames can be renumbered independently.

## Run a chapter

```bash
python -m venv .venv
.venv\Scripts\activate
pip install cirq cirq-superstaq python-dotenv
python ch01_amplitudes.py
```

`run_on_superstaq` reads a `SUPER_STAQ` API key from `.env` (gitignored) and uses `method="dry-run"`, so no real QPU time is spent.

## Website

Plain HTML/CSS/JS with no framework and no dependencies. Content lives in
`web/data/chapters.js` and `web/data/flashcards.js`.

```bash
npm run build      # web/ -> dist/, plus dist/build-info.json
```

- **Local, quick:** open `web/index.html` straight off disk. Everything works
  except the build stamp, which has no build to read.
- **Local, as deployed:** `npm run build`, then serve `dist/`.
- **Vercel:** Root Directory stays at the repo root. `vercel.json` sets the
  build command and `outputDirectory` to `dist`, so the config lives in the
  repo rather than in a dashboard field nobody can see.

Every page footer shows the commit it was built from. If production and your
local `git log` disagree, the deploy is stale, and you can tell at a glance
rather than trusting a green check.
