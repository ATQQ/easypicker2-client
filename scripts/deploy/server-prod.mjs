#!/usr/bin/env zx

import { $ } from 'zx'

// user config
const originName = 'ep2'
const serverName = 'ep-prod'

// not care
const compressPkgName = `${originName}-server.tar.gz`
const user = 'root'
const origin = 'sugarat.top'
const fullOrigin = `${originName}.${origin}`
const baseServerDir = '/www/wwwroot'
const destDir = 'easypicker2-server'
const serverDir = 'apps/server'
const remoteServerDir = `${baseServerDir}/${fullOrigin}/${destDir}`

await $`pnpm server:build`

await $`echo ==🔧 压缩服务端代码 ==`
await $`tar -zvcf ${compressPkgName} -C ${serverDir} dist package.json`

await $`echo ==🚀 上传到服务器 ==`
await $`scp ${compressPkgName} ${user}@${origin}:./`
await $`rm -rf ${compressPkgName}`

await $`echo ==✅ 部署服务端代码 ==`
await $`ssh -p22 ${user}@${origin} "mkdir -p ${remoteServerDir}"`
await $`ssh -p22 ${user}@${origin} "tar -xf ${compressPkgName} -C ${remoteServerDir}"`
await $`ssh -p22 ${user}@${origin} "cd ${remoteServerDir} && /www/server/nodejs/v22.11.0/bin/pnpm install"`

await $`echo ==🏆︎ 重启服务 ==`
await $`ssh -p22 ${user}@${origin} "pm2 restart ${serverName}"`
