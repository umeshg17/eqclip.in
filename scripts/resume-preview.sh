#!/usr/bin/env bash
# Resume PDF preview for resume/latex/resume.tex
#
# Default: ensure TeX on the host (Ubuntu/Debian: sudo apt install if missing),
#           then latexmk -pvc (rebuild on save).
# --once    Single pdflatex run + open PDF, then exit.
# --docker  Skip apt; use TeX inside Docker (no sudo). First run pulls ~1 GiB image.
#
# Run from a normal terminal when using apt so sudo can prompt for a password.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$ROOT/resume/latex"
DOCKER_IMAGE="${DOCKER_LATEX_IMAGE:-blang/latex:ubuntu}"

USE_DOCKER=0
ONCE=0
for arg in "$@"; do
  case "$arg" in
    --docker) USE_DOCKER=1 ;;
    --once|-1) ONCE=1 ;;
    -h|--help)
      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

has_pdflatex() { command -v pdflatex >/dev/null 2>&1; }
has_latexmk() { command -v latexmk >/dev/null 2>&1; }
has_docker() { command -v docker >/dev/null 2>&1; }

is_debian_like() {
  [[ -f /etc/os-release ]] || return 1
  # shellcheck source=/dev/null
  . /etc/os-release
  case "${ID:-}" in ubuntu|debian|linuxmint|pop) return 0 ;; esac
  case "${ID_LIKE:-}" in *debian*|*ubuntu*) return 0 ;; esac
  return 1
}

install_tex_via_apt() {
  echo ""
  echo "==> TeX not found. Installing texlive + latexmk via apt (sudo will ask for a password)…"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    latexmk
}

docker_tty_args() {
  if [[ -t 0 ]]; then echo -it; else echo -i; fi
}

docker_run() {
  # Args: extra docker run args..., then command string for container
  local run_args=("$@")
  echo ""
  echo "==> Using Docker image: $DOCKER_IMAGE (mounting $DIR)"
  if ! docker image inspect "$DOCKER_IMAGE" >/dev/null 2>&1; then
    echo "    (first run: pulling image, can take several minutes)"
  fi
  docker run --rm "$(docker_tty_args)" \
    -v "$DIR:/data:rw" \
    -w /data \
    "$DOCKER_IMAGE" \
    "${run_args[@]}"
}

run_host_once() {
  echo "==> Building resume.pdf (host) …"
  (cd "$DIR" && pdflatex -interaction=nonstopmode resume.tex)
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$DIR/resume.pdf" 2>/dev/null || true
  fi
  echo "Done: $DIR/resume.pdf"
}

run_host_watch() {
  cd "$DIR"
  if has_latexmk; then
    echo "==> Watching resume.tex — save to rebuild. Ctrl+C to stop."
    exec latexmk -pdf -pvc -interaction=nonstopmode resume.tex
  fi
  echo "==> latexmk not found; running one pdflatex build. Install latexmk for live preview:"
  echo "    sudo apt install latexmk"
  run_host_once
}

main() {
  cd "$DIR"

  if [[ "$USE_DOCKER" -eq 1 ]]; then
    has_docker || {
      echo "Docker not found. Install Docker or run without --docker on Ubuntu/Debian to use apt."
      exit 1
    }
    if [[ "$ONCE" -eq 1 ]]; then
      docker_run pdflatex -interaction=nonstopmode resume.tex
      if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$DIR/resume.pdf" 2>/dev/null || true
      fi
      echo "Done: $DIR/resume.pdf"
      exit 0
    fi
    echo "==> Docker live preview (latexmk -pvc inside container)"
    docker_run latexmk -pdf -pvc -interaction=nonstopmode resume.tex
    exit 0
  fi

  # Host path: try apt on Debian-like systems if pdflatex missing
  if ! has_pdflatex; then
    if is_debian_like; then
      set +e
      install_tex_via_apt
      apt_ec=$?
      set -e
      if [[ "$apt_ec" -ne 0 ]]; then
        echo ""
        echo "WARNING: apt install failed (cancelled password, offline, etc.)."
      fi
    else
      echo "Non-Debian system: install TeX with your OS package manager, or use:"
      echo "  $0 --docker"
    fi
  fi

  if ! has_pdflatex; then
    if has_docker; then
      echo "Falling back to Docker. To skip apt next time: $0 --docker"
      fb=(--docker)
      [[ "$ONCE" -eq 1 ]] && fb+=(--once)
      exec "$0" "${fb[@]}"
    fi
    echo ""
    echo "pdflatex still not available. Options:"
    echo "  1) Ubuntu/Debian: run this script in a terminal and approve sudo when prompted."
    echo "  2) Any OS with Docker:  $0 --docker"
    echo "  3) Install TeX manually, then: $0"
    exit 1
  fi

  if [[ "$ONCE" -eq 1 ]]; then
    run_host_once
    exit 0
  fi

  run_host_watch
}

main "$@"
