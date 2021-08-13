# /etc/bash/bashrc

# https://www.npmjs.com/package/protobufjs#pbjs-for-javascript
# install pbjs by:
# yarn global add protobufjs

echo "====== deleting old files ======="
find . -path ./class -prune -false -o -name "*.js" ! -name "index.js" -exec rm {} \;

echo "==== starting making pb files ..."
xsync_dir=$1
for proto_file in `find $xsync_dir -type f -name "*.proto"`;
do
  proto_filename=`basename ${proto_file}`
  proto_name=${proto_filename%%.proto}
  js_file=${proto_name}.js
  echo "generate ${js_file} from ${proto_file}"
  pbjs -t json-module ${proto_file} -o ${js_file} -r ${proto_name} --keep-case --es6
done

echo "==== pb file make over......"
