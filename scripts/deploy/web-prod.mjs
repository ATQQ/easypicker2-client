#!/usr/bin/env zx

import { $ } from 'zx'

// user config
const originName = 'ep2'

// not care
const compressPkgName = `${originName}-web.tar.gz`
const user = 'root'
const origin = 'sugarat.top'
const fullOrigin = `${originName}.${origin}`
const baseServerDir = '/www/wwwroot'
const destDir = ''
const webDir = 'apps/web'

await $`pnpm web:build`

await $`echo ==🔧 压缩前端 dist ==`
await $`tar -zvcf ${compressPkgName} -C ${webDir} dist`
await $`rm -rf ${webDir}/dist`

await $`echo ==🚀 上传到服务器 ==`
await $`scp ${compressPkgName} ${user}@${origin}:./`
await $`rm -rf ${compressPkgName}`

await $`echo ==✅ 部署前端代码 ==`
await $`ssh -p22 ${user}@${origin} "tar -xf ${compressPkgName} -C ${baseServerDir}/${fullOrigin}/${destDir}"`
