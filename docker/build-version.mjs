import pkg from '../package.json' assert { type: 'json' }

await $`bash ./bash.sh`
await $`docker build -t sugarjl/easypicker:${pkg.version} .`
