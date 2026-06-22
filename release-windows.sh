#!/bin/bash

# This packages a Windows release of a demo

set -euo pipefail

INPUT_DEMO_DIR="${1:-}"
if [[ -z "$INPUT_DEMO_DIR" ]]; then
	echo "Usage: ./release-windows.sh <demo-directory-under-public>" >&2
	exit 1
fi

DEMO_DIR="${INPUT_DEMO_DIR#/}"
DEMO_DIR="${DEMO_DIR%/}"

if [[ -z "$DEMO_DIR" || "$DEMO_DIR" == *".."* ]]; then
	echo "Invalid demo directory: $INPUT_DEMO_DIR" >&2
	exit 1
fi

DEMO_SOURCE_DIR="$(pwd)/public/${DEMO_DIR}"
if [[ ! -d "$DEMO_SOURCE_DIR" ]]; then
	echo "Demo directory does not exist or is not a directory: public/${DEMO_DIR}" >&2
	exit 1
fi

if [[ ! -f "$DEMO_SOURCE_DIR/Demo.js" ]]; then
	echo "Missing Demo.js in demo directory root: public/${DEMO_DIR}" >&2
	exit 1
fi

rm -fr dist/
NODE_ENV=exe npx vite build

#this canbe used to check if build works: npx vite preview
rm -rf dist/data_*
rm -rf dist/testdata*
rm -f dist/playlist.js

CURRENT_DIR=$(pwd)

TMPDIR=$(mktemp -d)
echo "Preparing release in $TMPDIR"

cp -r dist/ $TMPDIR

cd $TMPDIR

ENGINE_WINDOWS_ZIP_URL="https://github.com/jumalauta/jml-engine-webgl/releases/download/v3.6.0/engine_v3_6_0_windows.zip"
ENGINE_WINDOWS_ZIP_FILE=$(basename "$ENGINE_WINDOWS_ZIP_URL")
ENGINE_WINDOWS_ZIP_SHA256SUM="e328264468cac7d4be43661893e9058c5760a74e4165336ced62d9d4e17a881d"

wget "$ENGINE_WINDOWS_ZIP_URL"
echo "${ENGINE_WINDOWS_ZIP_SHA256SUM} ${ENGINE_WINDOWS_ZIP_FILE}" | sha256sum -c
unzip -x "$ENGINE_WINDOWS_ZIP_FILE"
rm -fr "$ENGINE_WINDOWS_ZIP_FILE"

ENGINE_EXE=$(find . -type f -name "WebDemoExe.exe" | head -n 1)
if [[ -z "$ENGINE_EXE" ]]; then
	ENGINE_EXE=$(find . -type f -name "demo.exe" | head -n 1)
fi
if [[ -z "$ENGINE_EXE" ]]; then
	ENGINE_EXE=$(find . -type f -name "*.exe" | head -n 1)
fi
if [[ -z "$ENGINE_EXE" ]]; then
	echo "No executable found in $ENGINE_WINDOWS_ZIP_FILE" >&2
	exit 1
fi

ENGINE_ROOT=$(dirname "$ENGINE_EXE")

cat > "$ENGINE_ROOT/webdemoexe.xml" <<EOF
<config>
	<title>JML</title>
</config>
EOF

if [[ "$(basename "$ENGINE_EXE")" != "demo.exe" ]]; then
	mv "$ENGINE_EXE" "$ENGINE_ROOT/demo.exe"
fi

rm -fr "$ENGINE_ROOT/demo"
mv dist "$ENGINE_ROOT/demo"
TARGET_DATA_DIR="$ENGINE_ROOT/demo/data"
rm -rf "$TARGET_DATA_DIR"
mkdir -p "$TARGET_DATA_DIR"
cp -r "$DEMO_SOURCE_DIR"/. "$TARGET_DATA_DIR"/

cd $CURRENT_DIR
mv $TMPDIR $CURRENT_DIR/dist/release

echo "Release is in dist/release and includes public/${DEMO_DIR} as demo/data"
