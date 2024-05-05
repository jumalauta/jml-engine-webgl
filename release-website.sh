#!/bin/bash

# This packages a Windows release of a demo

set -euxo pipefail

rm -fr dist/
npx vite build

#this canbe used to check if build works: npx vite preview

rm -rf dist/data_*
rm -rf dist/testdata*
rm -f dist/playlist.js

mv dist v2p3
tar -czvf v2p3.tar.gz v2p3

lftp -u jml -e 'cd /pubhtml;put v2p3.tar.gz;quit' jumalauta.untergrund.net
rm -rf v2p3.tar.gz v2p3

