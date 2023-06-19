#!/bin/sh

test ! -n "$1" && echo "Please specify project name" && exit 1

project=$1
echo "Creating new project: $project"

pdir="./$project"
mkdir -p $pdir
im_dir="$pdir/src/im"

cp LICENCE-MAXIM.md $pdir/
cp README-project.md $pdir/README.md
cp ChangeLog.md $pdir/
cp .gitignore $pdir/
cp prettier.config.js $pdir/
cp .prettierignore $pdir/
cp babel.config.js $pdir/
cp vue.config.js $pdir/

cp package.json $pdir/

cp -R ./src $pdir/
cp -R ./public $pdir/

rm -rf $pdir/src/sdk

mkdir -p $pdir/config
mkdir -p $im_dir
cp ./build/sdk/floo-*.js $im_dir
gsed -i'' -E "s/(.*)\/sdk\/index(.*)/\1\/im\/floo-3.0.0\2/g" $pdir/src/ui/index.vue

cp ./config/webpack.prod.config.js $pdir/config/
cp ./config/webpack.dev.config.js $pdir/config/

echo "done."
