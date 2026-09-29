# IEEE technical reports

Two documents, one per application, each self-contained and written in IEEE
conference format (`IEEEtran`, two columns, Spanish prose, English identifiers).

| Document | Covers | Result |
|---|---|---|
| [`bodylab.tex`](bodylab.tex) → `bodylab.pdf` | the measurement half: problem and approach, related work, architecture and the core-independence rule, the domain engines, the exercise catalogue and its didactic layer, copyright strategy for media, all nine interfaces with the responsive contract, the verification model, and the target state | ~6 pp. |
| [`traininglab.tex`](traininglab.tex) → `traininglab.pdf` | the training half: the design methodology (what was adopted from commercial references and what was refused), the deterministic session and week engines, the local decision model, the local LLM assistant with its measured results, every interface including the immersive session screen, the media pipeline and its licensing stance, and the phased roadmap | ~5 pp. |

Both include figures of the real application (taken from the committed
screenshots) and vector diagrams drawn with TikZ, so the documents stay sharp at
any zoom and contain no third-party artwork.

## Building the PDFs

```bash
cd fitness-ecosystem
node scripts/build-ieee-docs.mjs --check     # toolchain present? PDFs stale?
node scripts/build-ieee-docs.mjs             # build both
node scripts/build-ieee-docs.mjs bodylab.tex # just one
```

The engine is **tectonic** — a single portable executable that needs no
installation, no administrator rights, and downloads the TeX packages it needs
on first run. The build script looks for it in the repository-local
`.tools/tectonic/` (gitignored) and then on `PATH`, so a machine with TeX Live or
MiKTeX works as-is.

To set it up on a fresh machine (one command, ~30 MB):

```bash
mkdir -p .tools/tectonic && cd .tools/tectonic
curl -sL -o t.zip "https://github.com/tectonic-typesetting/tectonic/releases/latest/download/tectonic-0.17.0-x86_64-pc-windows-msvc.zip"
unzip t.zip && ./tectonic.exe --version
```

## Editing conventions

- **Spanish prose, English identifiers.** Section titles follow IEEE numbering
  automatically; do not hard-code "I.", "II.".
- Accents are written as LaTeX macros (`\'a`, `\'i`, `\~n`) so the sources do not
  depend on the file encoding of whoever opens them.
- Avoid `amssymb`-only symbols: the engine pulls a minimal package set, and a
  missing symbol surfaces as a build error rather than a warning.
- Long file names inside `\code{}` cannot be hyphenated — cite documents by
  title instead of by path in the bibliography, or they will overflow the column.
- The build script reports `Overfull \hbox` counts; treat a non-zero count as a
  cosmetic regression to fix, and zero as the expected state.
