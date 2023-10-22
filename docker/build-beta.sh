bash ./bash.sh
docker buildx build -t sugarjl/easypicker:beta --platform=linux/arm,linux/arm64,linux/amd64 . --push