import type { CliOptions } from '../args'
import type { DeployTarget, PackageVersion } from '../registry'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { cancel, isCancel, select } from '@clack/prompts'
import { copyServerFiles, copyWebDist, extractTarball } from '../archive'
import { getBooleanOption, getStringOption } from '../args'
import { log } from '../log'
import { downloadTarball, listVersions, resolveVersion } from '../registry'
import { printServerDeployPm2Commands } from './pm2'

function getTarget(value?: string): DeployTarget {
  if (value === 'web' || value === 'server') {
    return value
  }
  throw new Error('请指定部署目标：web 或 server')
}

async function chooseVersion(target: DeployTarget, registry: string, tag: string): Promise<PackageVersion> {
  const versions = await listVersions({ target, registry, tag })
  if (!versions.length) {
    throw new Error(`没有找到 ${target} 的 ${tag} 版本`)
  }

  const picked = await select({
    message: `选择 ${target} 部署版本`,
    options: versions.map(item => ({
      value: item.version,
      label: item.version,
    })),
    initialValue: versions[0].version,
  })

  if (isCancel(picked)) {
    cancel('取消部署')
    process.exit(0)
  }

  return versions.find(item => item.version === picked) || versions[0]
}

export async function deploy(positionals: string[], options: CliOptions) {
  const target = getTarget(positionals[0])
  const cwd = path.resolve(getStringOption(options, 'cwd', process.cwd()))
  const tag = getStringOption(options, 'tag', 'latest')
  const registry = getStringOption(options, 'registry', 'https://registry.npmmirror.com')
  const version = typeof options.version === 'string' ? options.version : undefined
  const pm2Name = getStringOption(options, 'pm2Name', 'ep-server')
  const serverDir = path.resolve(cwd, getStringOption(options, 'dir', 'easypicker2-server'))
  const keepTarball = getBooleanOption(options, 'keepTarball')
  const overwriteEnv = getBooleanOption(options, 'overwriteEnv')
  const interactive = getBooleanOption(options, 'interactive')

  log.title(`部署 EasyPicker2 ${target}`)
  log.info(`读取 ${registry} 版本信息`)

  const versionInfo = interactive && !version
    ? await chooseVersion(target, registry, tag)
    : await resolveVersion({ target, registry, tag, version })
  log.success(`命中版本：${versionInfo.name}@${versionInfo.version}`)

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'easypicker2-cli-'))
  try {
    log.info('下载资源包')
    const tarball = await downloadTarball(versionInfo.dist.tarball, tempDir)
    log.success(`下载完成：${path.basename(tarball)}`)

    log.info('解压资源包')
    const packageDir = await extractTarball(tarball, tempDir)

    if (target === 'web') {
      const dist = await copyWebDist(packageDir, cwd)
      log.success(`前端资源已部署到：${dist}`)
      log.warn('请确认 Nginx 站点根目录指向上面的 dist 目录')
      return
    }

    const deployedDir = await copyServerFiles(packageDir, serverDir, overwriteEnv)
    log.success(`服务端资源已部署到：${deployedDir}`)
    log.warn('CLI 不会安装依赖或直接操作 PM2，请按需复制命令；进阶说明见文档站。')
    printServerDeployPm2Commands({
      name: pm2Name,
      cwd: deployedDir,
    })
  }
  finally {
    if (!keepTarball) {
      await rm(tempDir, { recursive: true, force: true })
    }
    else {
      log.info(`已保留临时资源目录：${tempDir}`)
    }
  }
}
