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

export function printServerDeployPm2Commands(options: {
  name: string
  cwd: string
}) {
  const serverDir = path.resolve(options.cwd)

  log.title('首次部署：启动服务')
  console.log('如果这个服务还没有被 PM2 启动过，复制执行这一组命令：')
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
  console.log('如果之前已经启动过服务，本次只是更新代码，复制执行这一组命令：')
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

  log.title('查看运行状态')
  console.log('启动或重启后，可按需执行：')
  printCommandTips([
    {
      description: '查看 PM2 服务列表',
      command: 'pm2 list',
    },
    {
      description: '查看服务标准输出日志',
      command: `pm2 logs ${options.name} --out`,
    },
  ])

  printPm2ExtraTips()
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
  printPm2ExtraTips()
}
