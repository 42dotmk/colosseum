dirs=($(find . -type d -maxdepth 1))
for dir in "${dirs[@]}"; do
  pushd $dir > /dev/null;
  echo "Building $dir";
  echo docker build -t ghcr.io/42dotmk/colosseum-executioner-${dir:2}:latest .;
  docker build -t ghcr.io/42dotmk/colosseum-executioner-${dir:2}:latest .;
  popd > /dev/null;
done