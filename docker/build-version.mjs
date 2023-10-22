import fs from 'fs'
import pkg from '../package.json' assert { type: 'json' }

// 目录准备
if (!fs.existsSync('./client')) {
  fs.mkdirSync('./client')
}

// 拷贝服务端资源(不在当前项目里，以后优化)
await $`cp -rf ../dist ./client/dist`
// 拷贝服务端资源(不在当前项目里，以后优化)
await $`cp -rf ./../../easypicker2-server/dist ./server`
await $`cp -rf ./../../easypicker2-server/package.json ./server`
await $`cp -rf ./../../easypicker2-server/pnpm-lock.yaml ./server`
await $`docker build -t sugarjl/easypicker:${pkg.version} .`
