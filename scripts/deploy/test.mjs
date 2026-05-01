#!/usr/bin/env zx

import { $ } from 'zx'

// user config
const originName = ['ep.test', 'ep.dev']

// not care
const compressPkgName = `${originName}.tar.gz`
const user = 'root'
const origin = 'sugarat.top'
const baseServerDir = '/www/wwwroot'
const destDir = ''
const webDir = 'apps/web'

await $`pnpm build`

await $`echo ==🔧 压缩dist ==`
await $`cd ${webDir} && tar -zvcf ../../${compressPkgName} dist && rm -rf dist`

await $`echo ==🚀 上传到服务器 ==`
await $`scp ${compressPkgName} ${user}@${origin}:./`
await $`rm -rf ${compressPkgName}`

await $`echo ==✅ 部署代码 ==`
for (const name of originName) {
  await $`ssh -p22 ${user}@${origin} "tar -xf ${compressPkgName} -C ${baseServerDir}/${name}.${origin}/${destDir}"`
}
