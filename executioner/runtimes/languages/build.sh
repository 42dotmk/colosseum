dirs=($(find . -type d -mindepth 1))
for dir in "${dirs[@]}"; do
  pushd $dir > /dev/null;
  docker build -t ghcr.io/42dotmk/colosseum-executioner-${dir:2}:latest .;
  popd > /dev/null;
done