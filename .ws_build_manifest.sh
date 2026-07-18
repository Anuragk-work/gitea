#!/usr/bin/env bash
# .ws_build_manifest.sh — Project health gates for Strategic P&E
# Generated: 2026-07-18T23:13:11Z
# Components: root (go)
# Changelog:
#   v1 — Auto-generated from project detection

set -euo pipefail
WORKSPACE_ROOT="/Users/anuragk/Work/sasva-desktop-testing/gitea"

install() {
  cd "$WORKSPACE_ROOT"
  go mod download 2>&1 || true
}

build() {
  cd "$WORKSPACE_ROOT"
  go build ./... 2>&1
}

test() {
  cd "$WORKSPACE_ROOT"
  go test ./... 2>&1
}

lint() {
  cd "$WORKSPACE_ROOT"
  go vet ./... 2>&1 || true
}

# Entry point: call function by name
case "${1:-help}" in
  install|build|test|lint) "$1" ;;
  all) install && build && test && lint ;;
  *) echo "Usage: $0 {install|build|test|lint|all}" ;;
esac
