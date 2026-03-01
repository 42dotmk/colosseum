dirs=($(find . -mindepth 1 -maxdepth 1 -type d))
for dir in "${dirs[@]}"; do
  image_name="${dir#./}"
  echo "Pulling $dir";
  echo docker pull ghcr.io/42dotmk/colosseum-executioner-${image_name}:latest;
  docker pull ghcr.io/42dotmk/colosseum-executioner-${image_name}:latest;
done