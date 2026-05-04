import type { Route } from 'flash-wolves'
import { App, pathJoin } from 'flash-wolves'
import { ensureLogIndexes } from '@/db/logDb'
// 配置文件
import { serverConfig } from './config'

import controllers from './controllers'

// interceptor
import {
  beforeRouteMatchInterceptor,
  beforeRuntimeErrorInterceptor,
  routeInterceptor,
  serverInterceptor,
} from './middleware'
// routes
import routes from './routes'

import { ensureMysqlBootstrap } from './utils/mysql-bootstrap'
import {
  initUserConfig,
  readyServerDepService,
  runMysqlPatchesOnStartup,
} from './utils/patch'
import LocalUserDB from './utils/user-local-db'
import 'reflect-metadata'

console.time('server-start')

const app = new App(serverInterceptor, {
  beforeMathRoute: beforeRouteMatchInterceptor,
  beforeRunRoute: routeInterceptor,
  beforeReturnRuntimeError: beforeRuntimeErrorInterceptor,
})

function addRoutePrefixAlias(app: App, prefix: string) {
  const routes = [...app.getRoutes()]
  const routeKeys = new Set(routes.map(route => `${route.method}:${route.path}`))
  const aliasRoutes = routes.reduce((prev, route) => {
    if (route.path === prefix || route.path.startsWith(`${prefix}/`)) {
      return prev
    }

    const aliasPath = pathJoin(prefix, route.path)
    const routeKey = `${route.method}:${aliasPath}`
    if (routeKeys.has(routeKey)) {
      return prev
    }

    routeKeys.add(routeKey)
    prev.push({
      ...route,
      path: aliasPath,
    })
    return prev
  }, [] as Route[])

  app.addRoutes(aliasRoutes)
}

// 注册路由
app.addRoutes(routes)
app.addController(controllers)
addRoutePrefixAlias(app, '/api')

app.listen(serverConfig.port, serverConfig.hostname, async () => {
  console.log('-----', new Date().toLocaleString(), '-----')
  console.timeEnd('server-start')
  // 存储一些配置
  await LocalUserDB.initUserConfig()
  await initUserConfig()
  try {
    await ensureMysqlBootstrap()
  }
  catch (err: unknown) {
    console.warn(
      '❌ MySQL bootstrap（建库/导入表结构）',
      err instanceof Error ? err.message : err,
    )
  }
  try {
    await readyServerDepService()
  }
  catch (err) {
    console.log('❌ readyServerDepService', err?.message)
  }
  try {
    await ensureLogIndexes()
  }
  catch (err: any) {
    console.warn('❌ ensureLogIndexes', err?.message)
  }
  try {
    await runMysqlPatchesOnStartup()
    console.log('😄😄 mysql patch pipeline ok')
  }
  catch {
    console.log(
      '😭😭 mysql schema 对齐失败或未配置数据库，请到管理面板检查 MySQL',
    )
  }
})
