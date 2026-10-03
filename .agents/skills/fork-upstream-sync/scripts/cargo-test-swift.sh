#!/bin/bash
# Run `cargo test` on this Mac with the swift-rs archive-path bridge that
# `.agent/build-desktop-local.sh` applies to app builds. Swift 6.4 writes
# archives to out/Products/Debug while swift-rs links from
# arm64-apple-macosx/debug, so crates with Swift parts fail to link otherwise.
# Usage: cargo-test-swift.sh <cargo test args...>
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1
TARGET="target/debug/build"
bridge() {
  while true; do
    find "$TARGET" -maxdepth 5 -type d -path '*/out/swift-rs/*-swift' 2>/dev/null |
      while read -r d; do
        lib=$(cd "$d/out/Products/Debug" 2>/dev/null && ls lib*.a 2>/dev/null | head -1)
        [ -n "$lib" ] || continue
        [ -f "$d/arm64-apple-macosx/debug/$lib" ] && continue
        rm -rf "$d/arm64-apple-macosx"
        ln -s out/Products "$d/arm64-apple-macosx"
      done
    sleep 1
  done
}
bridge &
WATCHER=$!
trap 'kill $WATCHER 2>/dev/null' EXIT
RUSTFLAGS="-C strip=none" cargo test --locked "$@"
