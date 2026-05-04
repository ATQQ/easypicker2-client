#!/usr/bin/env node

import type { Pm2Action } from './commands/pm2'
import path from 'node:path'
import { getStringOption, parseArgs } from './args'
import { deploy } from './commands/deploy'
import { printPm2Commands } from './commands/pm2'
import { log } from './log'

const version = '0.1.0'

function printHelp() {
  console.log(`
EasyPicker2 CLI

用法:
  ep2 deploy web [options]
  ep2 deploy server [options]
  ep2 pm2 <start|restart|stop|delete|logs|list> [options]

部署选项:
  --tag <latest|beta>          选择 dist-tag，默认 latest
  --version <version>          指定精确版本，优先级高于 tag
  --interactive, -i            交互式选择版本，默认按 tag 过滤
  --registry <url>             npm registry，默认 https://registry.npmmirror.com
  --cwd <dir>                  部署工作目录，默认当前目录
  --dir <dir>                  服务端目录，默认 easypicker2-server
  --pm2-name <name>            PM2 服务名，默认 ep-server
  --overwrite-env              服务端部署时覆盖已有 .env
  --keep-tarball               保留下载和解压临时目录

说明:
  deploy server 完成后仅打印「首次部署」与「更新代码」两段命令；
  SERVER_PORT、ep2 pm2 子命令、日志与开机自启等详见 https://docs.ep.sugarat.top/deploy/cli
  执行 ep2 pm2 start 时会附带 SERVER_PORT 与 PM2 补充说明。

示例:
  ep2 deploy web
  ep2 deploy web -i
  ep2 deploy server --pm2-name ep-prod
  ep2 deploy server --tag beta --dir ./server
  ep2 pm2 restart --name ep-prod
`)
}

function isPm2Action(value?: string): value is Pm2Action {
  return value === 'start'
    || value === 'restart'
    || value === 'stop'
    || value === 'delete'
    || value === 'logs'
    || value === 'list'
}

async function main() {
  const { positionals, options } = parseArgs(process.argv.slice(2))
  const [command, subcommand, ...rest] = positionals

  if (options.version === true || command === 'version') {
    console.log(version)
    return
  }

  if (!command || options.help || command === 'help') {
    printHelp()
    return
  }

  if (command === 'deploy') {
    await deploy([subcommand, ...rest], options)
    return
  }

  if (command === 'web' || command === 'server') {
    await deploy([command, subcommand, ...rest], options)
    return
  }

  if (command === 'pm2') {
    if (!isPm2Action(subcommand)) {
      throw new Error('请指定 pm2 操作：start、restart、stop、delete、logs 或 list')
    }

    printPm2Commands({
      action: subcommand,
      name: getStringOption(options, 'name', getStringOption(options, 'pm2Name', 'ep-server')),
      cwd: path.resolve(getStringOption(options, 'cwd', getStringOption(options, 'dir', 'easypicker2-server'))),
    })
    return
  }

  throw new Error(`未知命令：${command}`)
}

main().catch((error) => {
  log.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
