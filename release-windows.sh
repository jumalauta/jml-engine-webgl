#!/bin/bash

# This packages a Windows release of a demo

set -euo pipefail

rm -fr dist/
npx vite build

#this canbe used to check if build works: npx vite preview

CURRENT_DIR=$(pwd)

TMPDIR=$(mktemp -d)
echo "Preparing release in $TMPDIR"

cp -r dist/ $TMPDIR

cd $TMPDIR

WEBDEMOEXE_VERSION="015"
WEBDEMOEXE_SHA256SUM="fa7724add6fa218c702814decb5710767b5ebe1b3818d6069a5ee067376454cc"

wget https://github.com/pandrr/WebDemoExe/releases/download/release${WEBDEMOEXE_VERSION}/webdemoexe_${WEBDEMOEXE_VERSION}.zip
echo "${WEBDEMOEXE_SHA256SUM} webdemoexe_${WEBDEMOEXE_VERSION}.zip" | sha256sum -c
unzip -x webdemoexe_${WEBDEMOEXE_VERSION}.zip
rm -fr webdemoexe_${WEBDEMOEXE_VERSION}.zip

cat > webdemoexe.xml <<EOF
<config>
	<title>JML</title>
</config>
EOF

mv WebDemoExe.exe demo.exe
node ${CURRENT_DIR}/change-favicon/index.js demo.exe ${CURRENT_DIR}/change-favicon/favicon.ico
rm -fr demo
mv dist demo

cd $CURRENT_DIR
mv $TMPDIR $CURRENT_DIR/dist/release

echo Release is in dist/release