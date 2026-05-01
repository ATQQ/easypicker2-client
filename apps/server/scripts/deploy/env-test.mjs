#!/usr/bin/env zx

// user config
const originName = ['ep.test','ep.dev']
const serverName = ['ep-server-test','ep-server-dev']

// not care
const compressPkgName = `test-pkg.tar.gz`
const user = 'root'
const origin = 'sugarat.top'
const baseServerDir = '/www/wwwroot'
const destDir = 'easypicker2-server'

await $`pnpm build`

await $`echo ==🔧 压缩==`
await $`tar -zvcf ${compressPkgName} dist package.json`

await $`echo ==🚀 上传到服务器 ==`
await $`scp ${compressPkgName} ${user}@${origin}:./`
await $`rm -rf ${compressPkgName}`

await $`echo ==✅ 部署代码 ==`
if (destDir) {
    for (const name of originName) {
        await $`ssh -p22 ${user}@${origin} "mkdir -p ${baseServerDir}/${name}.${origin}/${destDir}"`
    }
}
for (const name of originName) {
    await $`ssh -p22 ${user}@${origin} "tar -xf ${compressPkgName} -C ${baseServerDir}/${name}.${origin}/${destDir}"`
    await $`ssh -p22 ${user}@${origin} "cd ${baseServerDir}/${name}.${origin}/${destDir} && pnpm install"`
}


await $`echo ==🏆︎ 重启服务 ==`
for (const name of serverName) {
    await $`ssh -p22 ${user}@${origin} "pm2 restart ${name}"`
}