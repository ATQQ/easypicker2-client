import type {
  FWRequest,
} from 'flash-wolves'
import type { User as EntityUser } from '@/db/entity/User'
import type { User } from '@/db/model/user'
import dayjs from 'dayjs'
import {
  Delete,
  Get,
  Inject,
  Post,
  Put,
  ReqBody,
  Response,
  RouterController,
} from 'flash-wolves'
import { In } from 'typeorm'
import { UserError } from '@/constants/errorMsg'
import { FileRepository, selectFiles } from '@/db/fileDb'
import { addBehavior, addSystemBehavior } from '@/db/logDb'
import { MessageType } from '@/db/model/message'
import { USER_POWER, USER_STATUS } from '@/db/model/user'
import { expiredRedisKey, getRedisVal } from '@/db/redisDb'
import {
  selectUserByAccount,
  selectUserById,
  selectUserByPhone,
  updateUser,
  UserRepository,
} from '@/db/userDb'
import { ReqUserInfo } from '@/decorator'
import {
  BehaviorService,
  FileService as newFileService,
  QiniuService,
  SuperUserService,
  TokenService,
} from '@/service'
import FileService from '@/service/file'
import MessageService from '@/service/message'
import SuperService from '@/service/super'
import { sendMail } from '@/utils/mail'
import { batchDeleteFiles } from '@/utils/qiniuUtil'
import { rEmail, rMobilePhone, rPassword, rVerCode } from '@/utils/regExp'
import { isLocalStorageMode } from '@/utils/storageMode'
import { encryption, formatSize, getUniqueKey } from '@/utils/stringUtil'
import LocalUserDB from '@/utils/user-local-db'

const power = {
  userPower: USER_POWER.SUPER,
  needLogin: true,
}

@RouterController('super/user', power)
export default class SuperUserController {
  @Inject(TokenService)
  private tokenService: TokenService

  @Inject(SuperUserService)
  private superUserService: SuperUserService

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(UserRepository)
  private userRepository: UserRepository

  @Inject(QiniuService)
  private qiniuService: QiniuService

  @Inject(FileRepository)
  private fileRepository: FileRepository

  @Inject(newFileService)
  private fileService: newFileService

  @Post('message')
  async sendMessage(
    @ReqBody('type')
    type: MessageType,
    @ReqBody('text')
    text: string,
    @ReqUserInfo() user: User,
    @ReqBody('target')
    target?: number,
  ) {
    // 数据格式校验
    if ((type === MessageType.USER_PUSH && !target) || !text.trim()) {
      return
    }
    if (type === MessageType.USER_PUSH) {
      MessageService.sendMessage(user.id, target, text)
    }
    else if (type === MessageType.GLOBAL_PUSH) {
      MessageService.sendGlobalMessage(user.id, text)
    }
  }

  @Delete('logout')
  async logout(@ReqBody('account') account: string) {
    return this.superUserService.logout(account)
  }

  @Get('message', {
    userPower: USER_POWER.NORMAL,
  })
  async getMessageList(@ReqUserInfo() user: User) {
    const messageList = await MessageService.getMessageList(user.id)
    return messageList.map((v) => {
      return {
        id: v.id,
        type: v.type,
        style: v.style,
        date: v.date,
        text: v.text,
        read: v.read,
      }
    })
  }

  @Put('message', {
    userPower: USER_POWER.NORMAL,
  })
  readMessage(@ReqUserInfo() user: User, @ReqBody('id') id: string) {
    MessageService.readMessage(user.id, id)
  }

  /**
   * 获取用户列表
   */
  @Get('list')
  async getUserList() {
    // 用户数据
    const users = await this.userRepository.findMany({})
    // 获取文件数据
    const files = await this.fileRepository.findMany({})
    const { moneyStartDay } = LocalUserDB.getSiteConfig()
    const filesMap = isLocalStorageMode()
      ? new Map<string, Qiniu.ItemInfo>()
      : await this.qiniuService.getFilesMap(files)
    const downloadLog = await this.fileService.downloadLog('', {
      startTime: new Date(moneyStartDay),
    })
    // 遍历用户，获取文件数和占用空间数据
    for (const user of users) {
      const fileInfo = files.filter(file => file.userId === user.id)
      const overviewData = await this.fileService.getCachedUserOverview(user, {
        files: fileInfo,
        filesMap,
        downloadLog: downloadLog.filter(v => v.data?.info?.data?.account === user.account),
      })
      Object.assign(user, overviewData)
    }
    const sumCost = users.reduce((acc, cur: any) => acc + cur.cost, 0)
    return {
      list: users.map(u => ({
        ...u,
        phone: u?.phone?.slice(-4),
      })),
      sumCost: sumCost.toFixed(2),
    }
  }

  @Delete('clear/oss')
  async clearOssFiles(
    @ReqBody('id') id: number,
    @ReqBody('type')
    type: 'month' | 'quarter' | 'half',
    @ReqUserInfo()
    userInfo: User,
  ) {
    if (isLocalStorageMode()) {
      this.behaviorService.add('super', `清理用户云空间文件跳过 本机存储模式 操作人:${userInfo.account}`, {
        operator: userInfo.account,
        targetUserId: id,
        type,
      })
      return { cleared: 0, reason: 'local_storage' }
    }
    const user = (await selectUserById(id))[0]
    if (!user) {
      this.behaviorService.add('super', `清理用户云空间文件失败 用户不存在 id:${id} 操作人:${userInfo.account}`, {
        operator: userInfo.account,
        targetUserId: id,
        type,
      })
      return { cleared: 0, reason: 'user_not_found' }
    }
    const months = {
      month: 1,
      quarter: 3,
      half: 6,
    }
    if (!months[type]) {
      return { cleared: 0, reason: 'invalid_type' }
    }
    const beforeDate = dayjs().subtract(months[type], 'month')
    const files = (
      await selectFiles(
        {
          userId: id,
        },
        ['task_key', 'user_id', 'hash', 'name', 'date', 'id', 'oss_del_time', 'size', 'category_key'],
      )
    ).filter((v) => {
      return dayjs(v.date).isBefore(beforeDate) && !v.oss_del_time
    })
    if (files.length === 0) {
      this.behaviorService.add(
        'super',
        `清理用户云空间文件 无可清理 操作人:${userInfo.account} 目标:${user.account}(${user.id}) 类型:${type}`,
        {
          operator: userInfo.account,
          targetUserId: user.id,
          account: user.account,
          type,
        },
      )
      return { cleared: 0 }
    }
    const delKeys = files.map(FileService.getOssKey)
    const totalSize = files.reduce((sum, f) => sum + (+f.size || 0), 0)
    MessageService.sendMessage(
      userInfo.id,
      user.id,
      MessageService.clearMessageFormat('文件清理提醒', [
        `<strong style="font-weight: bold; color: rgb(71, 193, 168);">由于服务运维费用过高，系统已<span style="color:red;">自动清理 ${months[type]} 个月</span>之前收集的文件</strong>`,
        '如有特殊疑问，或者以后不希望被清理，请联系系统管理员Thanks♪(･ω･)ﾉ',
      ]),
    )
    batchDeleteFiles(delKeys)

    // 更新OSS资源移除时间
    await this.fileRepository.updateSpecifyFields({
      id: In(files.map(v => v.id)),
    }, {
      ossDelTime: new Date(),
    })

    const ossPrefixes = new Set<string>(['easypicker2/'])
    for (const file of files) {
      const categoryKey = file.category_key || file.categoryKey
      if (categoryKey && !categoryKey.startsWith('easypicker2')) {
        const prefix = `${categoryKey.split('/')[0]}/`
        ossPrefixes.add(prefix)
      }
    }
    await Promise.all([...ossPrefixes].map(prefix => SuperService.expireOssFilesCache(prefix)))
    await this.fileService.expireUserOverviewCache(user.id)

    this.behaviorService.add(
      'super',
      `清理用户云空间文件 操作人:${userInfo.account} 目标:${user.account}(${user.id}) 类型:${type} 文件数:${files.length} 总大小:${formatSize(totalSize)}`,
      {
        operator: userInfo.account,
        targetUserId: user.id,
        account: user.account,
        type,
        fileCount: files.length,
        totalSize,
        keys: delKeys,
      },
    )
    return { cleared: files.length, totalSize }
  }

  /**
   * 修改账号状态
   */
  @Put('status')
  async changeStatus(
    @ReqBody('id') id: number,
    @ReqBody('status') status: USER_STATUS,
    @ReqBody('openTime') openTime: any,
  ) {
    if (status !== USER_STATUS.FREEZE) {
      openTime = null
    }
    else {
      openTime = new Date(new Date(openTime).getTime())
    }
    await updateUser(
      {
        status,
        openTime,
      },
      {
        id,
      },
    )
  }

  @Put('password')
  async resetPassword(
    @ReqBody('id') id: number,
    @ReqBody('password') password: string,
    req: FWRequest,
  ) {
    const user = await selectUserById(id)
    if (!user.length || !rPassword.test(password)) {
      addBehavior(req, {
        module: 'super',
        data: req.body,
        msg: '管理员重置用户密码: 参数不合法',
      })
      return Response.fail(500, '参数不合法')
    }
    delete req.body.password
    addBehavior(req, {
      module: 'super',
      data: req.body,
      msg: `管理员重置用户密码: ${user[0].account}`,
    })
    await updateUser(
      {
        password: encryption(password),
      },
      {
        id,
      },
    )
  }

  @Put('phone')
  async resetPhone(
    @ReqBody('id') id: number,
    @ReqBody('phone') phone: string,
    @ReqBody('code') code: string,
    req: FWRequest,
  ) {
    const user = await selectUserById(id)
    if (!user.length || !rMobilePhone.test(phone) || !rVerCode.test(code)) {
      addBehavior(req, {
        module: 'super',
        data: req.body,
        msg: '管理员重置手机号: 参数不合法',
      })
      return Response.fail(500, '参数不合法')
    }
    const realCode = await getRedisVal(`code-${phone}`)
    if (realCode !== code) {
      addBehavior(req, {
        module: 'super',
        data: req.body,
        msg: '管理员重置手机号: 验证码错误',
      })
      return Response.failWithError(UserError.code.fault)
    }

    let [otherUser] = await selectUserByPhone(phone)
    if (!otherUser) {
      ;[otherUser] = await selectUserByAccount(phone)
    }
    if (otherUser) {
      addBehavior(req, {
        module: 'super',
        msg: `管理员重置手机号: 手机号 ${phone} 已存在`,
        data: req.body,
      })
      return Response.failWithError(UserError.mobile.exist)
    }
    expiredRedisKey(`code-${phone}`)
    addBehavior(req, {
      module: 'super',
      data: req.body,
      msg: `管理员重置用户手机号: ${user[0].account}`,
    })
    await updateUser(
      {
        phone,
      },
      {
        id,
      },
    )
  }

  @Put('email')
  async resetEmail(
    @ReqBody('id') id: number,
    @ReqBody('email') email: string,
    @ReqUserInfo() admin: User,
  ) {
    const addr = String(email || '').trim().toLowerCase()
    const user = await this.userRepository.findOne({ id })
    if (!user || !rEmail.test(addr)) {
      this.behaviorService.add('super', '管理员绑定用户邮箱: 参数不合法', {
        id,
        email,
      })
      return Response.fail(500, '参数不合法')
    }

    const exist = await this.userRepository.findOne({ email: addr })
    if (exist && exist.id !== user.id) {
      this.behaviorService.add('super', `管理员绑定用户邮箱: 邮箱 ${addr} 已存在`, {
        id,
        email: addr,
      })
      return Response.failWithError(UserError.email.exist)
    }

    const oldEmail = user.email || ''
    user.email = addr
    user.emailVerified = 1
    await this.userRepository.update(user)
    this.behaviorService.add(
      'super',
      `管理员绑定用户邮箱 ${user.account} ${oldEmail || '未绑定'} => ${addr}`,
      {
        operator: admin?.account,
        targetId: user.id,
        account: user.account,
        oldEmail,
        email: addr,
      },
    )
    return { ok: true }
  }

  @Post('mail')
  async sendUserMail(
    @ReqBody('id') id: number,
    @ReqBody('subject') subject: string,
    @ReqBody('text') text: string,
    @ReqBody('html') html: string,
    @ReqUserInfo() admin: User,
  ) {
    const user = await this.userRepository.findOne({ id })
    const mailSubject = String(subject || '').trim()
    const mailText = String(text || '').trim()
    const mailHtml = String(html || '').trim()
    if (!user || !user.email || !mailSubject || (!mailText && !mailHtml)) {
      this.behaviorService.add('super', '管理员发送邮件给用户: 参数不合法', {
        operator: admin?.account,
        targetId: id,
        subject: mailSubject,
        text: mailText,
        html: mailHtml,
      })
      return Response.fail(500, '参数不合法')
    }

    const result = await sendMail({
      to: user.email,
      subject: mailSubject,
      text: mailText || mailHtml.replace(/<[^>]+>/g, ''),
      ...mailHtml && { html: mailHtml },
    })
    this.behaviorService.add(
      'super',
      `管理员发送邮件给用户 ${user.account} ${result.ok ? '成功' : '失败'}`,
      {
        operator: admin?.account,
        targetId: user.id,
        account: user.account,
        email: user.email,
        subject: mailSubject,
        text: mailText,
        html: mailHtml,
        result,
      },
    )
    if (!result.ok) {
      return Response.fail(500, result.error || '发送失败')
    }
    return result
  }

  @Put('size')
  async changeSize(@ReqBody('id') id: number, @ReqBody('size') size: number) {
    const user = await this.userRepository.findOne({
      id,
    })
    this.behaviorService.add(
      'super',
      `修改用户空间容量 ${user.account} ${user.size} => ${size}GB`,
      {
        oldSize: user.size,
        newSize: size,
      },
    )
    user.size = size
    await this.userRepository.update(user)
    await this.fileService.expireUserOverviewCache(user.id)
  }

  @Put('wallet')
  async updateWalletValue(@ReqBody('id') id: number, @ReqBody('value') value: number) {
    const user = await this.userRepository.findOne({
      id,
    })
    this.behaviorService.add(
      'super',
      `修改用户余额 ${user.account} ${user.wallet} => ${value} ￥`,
      {
        oldValue: user.wallet,
        newValue: value,
      },
    )
    user.wallet = value.toFixed(2)
    await this.userRepository.update(user)
    await this.fileService.expireUserOverviewCache(user.id)
  }

  @Post('billing/settle')
  async settleBilling(@ReqUserInfo() operator: User) {
    const oldMoneyStartDay = Number(LocalUserDB.getSiteConfig()?.moneyStartDay || Date.now())
    const newMoneyStartDay = Date.now()
    const users = await this.userRepository.findMany({})
    const normalUsers = users.filter(user => user.power === USER_POWER.NORMAL)
    const taskId = getUniqueKey()

    // 立即推进结算起点，避免后续业务页面在异步任务执行期间仍按旧周期计费
    const site = LocalUserDB.getSiteConfig()
    await LocalUserDB.updateUserConfig(
      {
        type: 'global',
        key: 'site',
      },
      {
        value: {
          ...site,
          moneyStartDay: newMoneyStartDay,
        },
      },
    )

    void this.runBatchSettle({
      taskId,
      operatorAccount: operator?.account || 'system',
      users: normalUsers,
      oldMoneyStartDay,
      newMoneyStartDay,
    })

    return {
      accepted: true,
      taskId,
      total: normalUsers.length,
      // 兼容旧前端解构：异步化后这些字段稍后由汇总日志记录
      settledCount: 0,
      skippedCount: 0,
      totalCost: '0.00',
      oldMoneyStartDay,
      newMoneyStartDay,
    }
  }

  /**
   * 后台异步批量结算：逐用户串行处理 + 每个用户之间节流，避免阻塞事件循环
   * - 无扣费 / 异常跳过，不写日志（避免日志洪水）
   * - 仅有实际扣费的用户单独写一条 addSystemBehavior 日志
   * - 任务收尾写一条汇总（仅计数与耗时，不含 details）
   */
  private async runBatchSettle(params: {
    taskId: string
    operatorAccount: string
    users: EntityUser[]
    oldMoneyStartDay: number
    newMoneyStartDay: number
  }) {
    const { taskId, operatorAccount, users: normalUsers, oldMoneyStartDay, newMoneyStartDay } = params
    const startedAt = Date.now()

    // 每个用户处理完之间的节流间隔（ms），让出事件循环 + 给 DB / 七牛喘息时间
    const PER_USER_DELAY_MS = 500
    const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

    let settledCount = 0
    let skippedCount = 0
    let errorCount = 0
    let totalCost = 0

    for (const user of normalUsers) {
      try {
        // 1. 仅取当前这个用户的文件，让 getUserOverview 自己按需拉 OSS（命中其内部缓存）
        const overview = await this.fileService.getUserOverview(user, {
          moneyStartDay: oldMoneyStartDay,
        })
        const cost = Number(overview?.cost || 0)

        // 2. 无扣费直接跳过（不写日志）
        if (!Number.isFinite(cost) || cost <= 0) {
          skippedCount += 1
          continue
        }

        // 3. 实际扣费
        const oldWallet = user.wallet || '0.00'
        const nextWallet = Number(user.wallet || 0) - cost
        user.wallet = nextWallet.toFixed(2)
        await this.userRepository.update(user)
        await this.fileService.expireUserOverviewCache(user.id)

        totalCost += cost
        settledCount += 1

        // 4. 仅在有扣费时单独记录一条行为日志
        addSystemBehavior({
          module: 'super',
          msg: `批量扣费 用户:${user.account}(${user.id}) 扣费:${cost.toFixed(2)}￥ 原余额:${oldWallet} 新余额:${user.wallet}`,
          data: {
            taskId,
            operator: operatorAccount,
            userId: user.id,
            account: user.account,
            oldWallet,
            cost: cost.toFixed(2),
            newWallet: user.wallet,
          },
        })
      }
      catch (err) {
        errorCount += 1
        addSystemBehavior({
          module: 'super',
          msg: `批量扣费失败 用户:${user.account}(${user.id}) 错误:${err instanceof Error ? err.message : String(err)}`,
          data: {
            taskId,
            operator: operatorAccount,
            userId: user.id,
            account: user.account,
            error: err instanceof Error ? err.message : String(err),
          },
        })
      }

      // 5. 每个用户处理完之间休眠一会儿（无论是否扣费）
      await sleep(PER_USER_DELAY_MS)
    }

    try {
      await this.fileService.expireAllUserOverviewCache()
    }
    catch {}

    // 6. 任务收尾：写一条精简汇总（不含 details，避免日志体积过大）
    addSystemBehavior({
      module: 'super',
      msg: `批量扣费完成 操作人:${operatorAccount} 总人数:${normalUsers.length} 结算:${settledCount} 跳过:${skippedCount} 失败:${errorCount} 总金额:${totalCost.toFixed(2)}￥ 耗时:${Date.now() - startedAt}ms`,
      data: {
        taskId,
        operator: operatorAccount,
        total: normalUsers.length,
        settledCount,
        skippedCount,
        errorCount,
        totalCost: totalCost.toFixed(2),
        oldMoneyStartDay,
        newMoneyStartDay,
        durationMs: Date.now() - startedAt,
      },
    })
  }
}
