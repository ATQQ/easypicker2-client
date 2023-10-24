import pkg from '../package.json' assert { type: 'json' }

await $`bash ./bash.sh`
await $`docker buildx build -t sugarjl/easypicker:${pkg.version} --platform=linux/arm64,linux/amd64 . --push`
