dirs=($(find . -type d -mindepth 1))
for dir in "${dirs[@]}"; do
  pushd $dir > /dev/null;
  docker build -t ghcr.io/42dotmk/executioner-${dir:2} .;
  popd > /dev/null;
done