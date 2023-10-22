bash ./bash.sh
docker buildx build -t sugarjl/easypicker:latest --platform=linux/arm,linux/arm64,linux/amd64 . --push