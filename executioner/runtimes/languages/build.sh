dirs=($(find . -mindepth 1 -maxdepth 1 -type d))
for dir in "${dirs[@]}"; do
  pushd "$dir" > /dev/null;
  image_name="${dir#./}"
  echo "Building $dir";
  echo docker build -t ghcr.io/42dotmk/colosseum-executioner-${image_name}:latest .;
  docker build -t ghcr.io/42dotmk/colosseum-executioner-${image_name}:latest .;
  popd > /dev/null;
done