import path from 'node:path'
import { log } from '../log'

export type Pm2Action = 'start' | 'restart' | 'stop' | 'delete' | 'logs' | 'list'

interface CommandTip {
  description: string
  command: string
}

function quote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function printCommandTips(items: CommandTip[]) {
  items.forEach((item) => {
    console.log(`- ${item.description}`)
    log.command(item.command)
  })
}

function printPm2ExtraTips() {
  log.title('可选：PM2 开机自启与恢复')
  console.log('- 配置开机自启：首次部署或更换 Node/PM2 环境后执行，PM2 会输出一条需要复制执行的系统命令')
  log.command('pm2 startup')
  console.log('- 保存当前进程列表：启动、删除、重命名服务后执行，确保重启机器后能恢复最新进程列表')
  log.command('pm2 save')
  console.log('- 恢复已保存进程：机器重启后如服务未自动恢复，可手动执行')
  log.command('pm2 resurrect')
}

/** 服务端监听端口取自环境变量 SERVER_PORT（源码 serverConfig.port） */
export function printServerPortEnvTip(pm2Name?: string) {
  const namePart = pm2Name ? `--name ${pm2Name}` : '--name <进程名>'
  log.title('监听端口 SERVER_PORT（默认多为 3000）')
  console.log('- 端口由进程环境变量 SERVER_PORT 决定，与 nginx / 反向代理的目标端口必须一致')
  console.log('- 推荐使用以下方式其一（任选）')
  console.log('')
  console.log('  1) PM2 ecosystem 或面板「环境变量」：为该进程写入 SERVER_PORT=<端口>（推荐，与生产 NODE_ENV 等一并配置）')
  console.log('')
  console.log('  2) Linux / macOS：在 pm2 start 命令前增加环境变量前缀：')
  log.command(`SERVER_PORT=4000 pm2 start npm ${namePart} -- run start`)
  console.log('')
  console.log('  3) 编辑 .env：仅当启动脚本会先合并 .env 到进程环境时才生效；仅用 node/pnpm run start 时请优先用上述方式注入 SERVER_PORT')
  console.log('')
  console.log('  修改端口后请同步调整 nginx「反向代理」的目标 URL，并重启 PM2 进程')
}

/** 服务端部署后与 PM2 相关的完整说明（端口、日志、开机自启等） */
export const SERVER_DEPLOY_PM2_DOCS_URL = 'https://docs.ep.sugarat.top/deploy/cli'

export function printServerDeployPm2Commands(options: {
  name: string
  cwd: string
}) {
  const serverDir = path.resolve(options.cwd)

  log.title('首次部署：启动服务')
  printCommandTips([
    {
      description: '进入服务端目录',
      command: `cd ${quote(serverDir)}`,
    },
    {
      description: '安装生产环境依赖',
      command: 'pnpm install --prod',
    },
    {
      description: '通过 PM2 启动服务',
      command: `pm2 start npm --name ${options.name} -- run start`,
    },
    {
      description: '保存当前 PM2 进程列表，方便开机后恢复',
      command: 'pm2 save',
    },
  ])

  log.title('更新代码：重启已有服务')
  printCommandTips([
    {
      description: '进入服务端目录',
      command: `cd ${quote(serverDir)}`,
    },
    {
      description: '更新生产环境依赖，避免 package.json 变更后缺依赖',
      command: 'pnpm install --prod',
    },
    {
      description: '重启已有 PM2 服务，让新代码生效',
      command: `pm2 restart ${options.name}`,
    },
  ])

  log.info(`监听端口 SERVER_PORT、pm2 logs / startup 等详见：${SERVER_DEPLOY_PM2_DOCS_URL}`)
}

export function printPm2Commands(options: {
  action?: Pm2Action
  name: string
  cwd: string
}) {
  const serverDir = path.resolve(options.cwd)
  const commands = {
    start: [
      {
        description: '进入服务端目录',
        command: `cd ${quote(serverDir)}`,
      },
      {
        description: '安装生产环境依赖',
        command: 'pnpm install --prod',
      },
      {
        description: '通过 PM2 启动服务',
        command: `pm2 start npm --name ${options.name} -- run start`,
      },
      {
        description: '保存当前 PM2 进程列表，方便开机后恢复',
        command: 'pm2 save',
      },
    ],
    restart: [
      {
        description: '重启指定服务',
        command: `pm2 restart ${options.name}`,
      },
      {
        description: '查看服务标准输出日志',
        command: `pm2 logs ${options.name} --out`,
      },
    ],
    stop: [
      {
        description: '停止指定服务，但保留 PM2 进程记录',
        command: `pm2 stop ${options.name}`,
      },
    ],
    delete: [
      {
        description: '从 PM2 进程列表中删除指定服务',
        command: `pm2 delete ${options.name}`,
      },
    ],
    logs: [
      {
        description: '查看服务标准输出日志',
        command: `pm2 logs ${options.name} --out`,
      },
    ],
    list: [
      {
        description: '查看当前 PM2 管理的全部服务',
        command: 'pm2 list',
      },
    ],
  } satisfies Record<Pm2Action, CommandTip[]>

  const action = options.action || 'start'
  log.title(`PM2 ${action} 指令`)
  printCommandTips(commands[action])
  if (action === 'start') {
    printServerPortEnvTip(options.name)
  }
  printPm2ExtraTips()
}
