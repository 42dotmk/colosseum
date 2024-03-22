dirs=($(find . -type d -maxdepth 1))
for dir in "${dirs[@]}"; do
  echo "Pulling $dir";
  echo docker pull ghcr.io/42dotmk/colosseum-executioner-${dir:2}:latest;
  docker pull ghcr.io/42dotmk/colosseum-executioner-${dir:2}:latest;
done