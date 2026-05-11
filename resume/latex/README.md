# Resume (LaTeX)

Source: `resume.tex` + `resume.cls`. Output: `resume.pdf` (ignored by git; see repo `.gitignore`).

## One command (recommended)

From the **repository root**:

```bash
./scripts/resume-preview.sh
```

**Docker only, one PDF (no apt, no watch):**

```bash
./scripts/resume-build-docker.sh
```

(This runs `resume-preview.sh --docker --once`.)

What `./scripts/resume-preview.sh` does, in order:

1. If **`pdflatex`** is already installed → starts **live preview** (`latexmk -pvc`: rebuild on every save).
2. Else, on **Ubuntu / Debian / Mint / Pop!_OS** → runs **`sudo apt install …`** for TeX Live + `latexmk` (you must enter your password in a **real terminal**).
3. If apt fails or you are not on Debian-like Linux → uses **Docker** if installed (`blang/latex:ubuntu`, first pull ~1 GiB).
4. If nothing works → prints clear next steps.

So you should not see `pdflatex: command not found` again as long as you either approve **sudo** once or use **Docker**.

### Flags

| Flag | Meaning |
|------|--------|
| *(none)* | Install TeX if needed (apt on Debian-like), then **watch** `resume.tex` |
| `--once` / `-1` | Single PDF build + open viewer, then exit |
| `--docker` | **Do not** run apt; build or watch **inside Docker** only |
| `--help` | Short usage |

Examples:

```bash
./scripts/resume-build-docker.sh              # one PDF via Docker (wrapper)

./scripts/resume-preview.sh --once              # one host build after apt if needed
./scripts/resume-preview.sh --docker            # live preview in container only
./scripts/resume-preview.sh --docker --once     # same as resume-build-docker.sh
```

Optional: override the LaTeX image:

```bash
DOCKER_LATEX_IMAGE=texlive/texlive:latest ./scripts/resume-preview.sh --docker --once
```

## Why `sudo` must be in *your* terminal

Package install needs your password. **IDE “Run” panels** often cannot complete `sudo`. If preview fails there, open a normal shell, `cd` to the repo, and run `./scripts/resume-preview.sh` once so apt can finish.

## After `apt install` — still “pdflatex: command not found”?

1. **Wait until apt fully finishes.** The TeX packages run `fmtutil` / “Building format(s)” at the end; that can take several minutes. Only then is `pdflatex` on disk.
2. **Refresh the shell command cache:** `hash -r` or open a **new terminal tab**, then `command -v pdflatex` (expect `/usr/bin/pdflatex`).
3. **Type the PDF path on one line** — a line break in `resume.pdf` breaks the command (e.g. `xdg-open resum` + newline + `e.pdf`).

## Manual commands (same as before)

```bash
cd resume/latex
latexmk -pdf -pvc -interaction=nonstopmode resume.tex
```

One-shot (keep `resume.pdf` on one line):

```bash
cd resume/latex
pdflatex -interaction=nonstopmode resume.tex && xdg-open resume.pdf
```

## Editor (Cursor / VS Code)

Install **LaTeX Workshop**, open `resume/latex/resume.tex`, build with the extension. Project root should include `resume.cls` (this directory).
