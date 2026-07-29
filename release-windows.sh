#!/bin/bash

# This packages a Windows release of a demo

set -euo pipefail

ENGINE_VERSION="v3.7.0"
ENGINE_DIR="engine_v3_7_0"
ENGINE_ZIP="${ENGINE_DIR}_windows.zip"
ENGINE_URL="https://github.com/jumalauta/jml-engine-webgl/releases/download/${ENGINE_VERSION}/${ENGINE_ZIP}"
ENGINE_SHA256SUM="f185bf3aa41d773d888ad247bc9291ce2f1ec2978718282a66f8b44807d7defd"

rm -fr dist/
#this canbe used to check if build works: npx vite preview
NODE_ENV=exe npx vite build

rm -rf dist/data_*
rm -rf dist/testdata*
rm -f dist/playlist.js

CURRENT_DIR=$(pwd)

TMPDIR=$(mktemp -d)
echo "Preparing release in $TMPDIR"

cd $TMPDIR

wget "${ENGINE_URL}"
echo "${ENGINE_SHA256SUM}  ${ENGINE_ZIP}" | sha256sum -c
unzip -x "${ENGINE_ZIP}"
rm -fr "${ENGINE_ZIP}"

# remove old project contents
rm -fr "${ENGINE_DIR}/demo"
mkdir -p "${ENGINE_DIR}/demo"
mkdir -p "${ENGINE_DIR}/demo/data"

# copy the build output, but never the 'data' directory
find "${CURRENT_DIR}/dist" -mindepth 1 -maxdepth 1 ! -name data -exec cp -r {} "${ENGINE_DIR}/demo/" \;

cd $CURRENT_DIR
mv "$TMPDIR/${ENGINE_DIR}" $CURRENT_DIR/dist/release-windows
rm -fr $TMPDIR

echo Release is in dist/release-windows - copy your 'data' directory contents into dist/release-windows/demo/data/
