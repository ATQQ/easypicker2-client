/* eslint-disable no-case-declarations */

import path from 'node:path'
import fs from 'node:fs'
import process from 'node:process'
import { Router } from 'flash-wolves'
import { getUserInfo } from '@/utils/userUtil'
import { publicError } from '@/constants/errorMsg'
import type { People } from '@/db/model/people'
import {
  deletePeople,
  insertPeople,
  selectPeople,
  updatePeople,
} from '@/db/peopleDb'
import { selectFiles } from '@/db/fileDb'
import { addBehavior, addErrorLog, findLog, findLogCount, getClientIp } from '@/db/logDb'
import { selectTasks } from '@/db/taskDb'
import { batchFileStatus } from '@/utils/qiniuUtil'

const router = new Router('people')
const fileDir = `${process.cwd()}/upload`

// TODO: excel格式支持
const supportType = ['text/plain']

/**
 * 上传人员名单
 */
router.post(
  '/:key',
  async (req, res) => {
    const { filename, type } = req.body
    const { id: userId, account: logAccount } = await getUserInfo(req)
    const { key } = req.params
    const filepath = path.join(fileDir, filename)

    if (!supportType.includes(type)) {
      res.failWithError(publicError.file.notSupport)
      return
    }
    switch (type) {
      case 'text/plain':
        const fileContent = fs.readFileSync(filepath, { encoding: 'utf-8' })
        if (fs.unlink) {
          fs.unlink(filepath, (err) => {
            if (err) {
              addErrorLog(req, err.message, err.stack)
            }
          })
        }
        const defaultData: People = { taskKey: key, userId }
        // 文件中的名单
        const peopleData: string[] = fileContent
          .split('\n')
          .map(v => v.trim().replace(/[\r\n]/g, ''))
          .filter(v => v)
        // 已经存在的名单
        const alreadyPeople = (await selectPeople(defaultData)).map(
          v => v.name,
        )

        const fail: string[] = []
        const success: string[] = []

        peopleData.forEach((p) => {
          if (alreadyPeople.includes(p)) {
            fail.push(p)
          }
          else if (!!p && !success.includes(p)) {
            success.push(p)
          }
        })
        if (success.length > 0) {
          await insertPeople(
            success.map(name => ({ name })),
            defaultData,
          )
        }

        addBehavior(req, {
          module: 'people',
          msg: `导入人员名单 用户:${logAccount} 成功:${success.length} 失败:${fail.length}`,
          data: {
            account: logAccount,
            success: success.length,
            fail: fail.length,
          },
        })
        res.success({
          success: success.length,
          fail,
        })
        return
      default:
        break
    }
    res.success()
  },
  {
    needLogin: true,
  },
)

/**
 * 获取人员列表
 */
router.get(
  '/:key',
  async (req, res) => {
    const { id: userId, account: logAccount } = await getUserInfo(req)
    const { key } = req.params
    const { detail } = req.query
    const showDetail = detail === '1'
    const people: any = (
      await selectPeople(
        {
          userId,
          taskKey: key,
        },
        [],
      )
    ).map(v => ({
      id: v.id,
      name: v.name,
      status: v.status,
      lastDate: v.submit_date,
      count: v.submit_count,
    }))
    for (const p of people) {
      // 用户提交的还存在的记录(没有被管理员删除)
      const existPeopleSubmitFiles = await selectFiles({
        userId,
        taskKey: key,
        people: p.name,
      })
      // 真现存文件数量
      const ossStatus
        = p.status && existPeopleSubmitFiles.length && showDetail
          ? await batchFileStatus(
            existPeopleSubmitFiles.map(
              v => `easypicker2/${v.task_key}/${v.hash}/${v.name}`,
            ),
          )
          : []

      const fileCount = p.status
        ? ossStatus.filter(v => v.code === 200).length
        : 0
      p.fileCount = fileCount

      // TODO: 优化这部分逻辑
      // 慢查询
      // 从日志中取数据
      // 提交文件数量 = 提交次数 - 撤回次数
      let submitCount = 0
      if (showDetail) {
        submitCount = p.status
          ? (await findLogCount({
              'type': 'behavior',
              'data.info.data.data.taskKey': key,
              'data.info.data.data.people': p.name,
              'data.info.data.data.user_id': userId,
              'data.req.path': '/file/info',
              'data.info.msg': {
                $regex: '成功$',
              },
            }))
            - (await findLogCount({
              'type': 'behavior',
              'data.info.data.data.taskKey': key,
              'data.info.data.data.peopleName': p.name,
              'data.user.userId': userId,
              'data.req.path': '/file/withdraw',
              'data.info.msg': {
                $regex: '^撤回文件成功',
              },
            }))
          : 0
      }
      // 提交文件数量，兼容旧数据取较高的值
      p.submitCount = Math.max(submitCount, fileCount)

      // 提交次数
      p.count = Math.max(p.count, p.submitCount)
    }
    addBehavior(req, {
      module: 'people',
      msg: `获取人员名单 用户:${logAccount}`,
      data: {
        account: logAccount,
      },
    })
    res.success({
      people,
    })
  },
  {
    needLogin: true,
  },
)

/**
 * 查看人员是否在提交名单中
 */
router.get('/check/:key', async (req, res) => {
  const { key } = req.params
  const { name } = req.query
  const [task] = await selectTasks({
    k: key,
  })
  if (!task) {
    res.success({
      exist: false,
    })
    return
  }
  const people = await selectPeople({
    taskKey: key,
    name,
  })
  const exist = people.length !== 0
  addBehavior(req, {
    module: 'people',
    msg: `查询是否拥有提交权限 任务:${task.name} 成员姓名:${name} 权限:${
      exist ? '有' : '无'
    }`,
    data: {
      taskName: task.name,
      name,
      exist,
    },
  })
  res.success({
    exist,
  })
})

/**
 * 删除指定人员
 */
router.delete(
  '/:key',
  async (req, res) => {
    const { key } = req.params
    const { id } = req.body
    const { id: userId, account: logAccount } = await getUserInfo(req)
    if (key && id && userId) {
      const [p] = await selectPeople({
        id,
      })
      if (p) {
        deletePeople({
          id,
          userId,
          taskKey: key,
        })

        // 记录日志
        ;(async () => {
          const [task] = await selectTasks({
            k: key,
          })
          if (task) {
            addBehavior(req, {
              module: 'people',
              msg: `删除任务人员 用户:${logAccount} 任务:${task.name} 成员:${p.name}`,
              data: {
                account: logAccount,
                taskName: task.name,
                name: p.name,
              },
            })
          }
        })()
      }
    }

    res.success()
  },
  {
    needLogin: true,
  },
)

/**
 * 更新人员提交信息
 */
router.put('/:key', async (req, res) => {
  const { key } = req.params
  const { name, filename, hash } = req.body
  if (!name || !filename || !key || !hash) {
    addBehavior(req, {
      module: 'people',
      msg: '更新提交人员信息 参数错误',
      data: {
        key,
        name,
        filename,
        hash,
      },
    })
    res.failWithError(publicError.request.errorParams)
    return
  }
  const files = await selectFiles({
    taskKey: key,
    name: filename,
    hash,
  })
  if (files.length === 0) {
    addBehavior(req, {
      module: 'people',
      msg: '更新提交人员信息 参数错误',
      data: {
        key,
        name,
        filename,
        hash,
      },
    })
    res.failWithError(publicError.request.errorParams)
    return
  }
  const alreadyCount
    = (
      await selectPeople(
        {
          taskKey: key,
          name,
        },
        ['name', 'submit_count'],
      )
    )[0].submit_count || 0

  await updatePeople(
    {
      status: 1,
      submitDate: new Date(),
      submitCount: alreadyCount + 1,
    },
    {
      name,
      taskKey: key,
    },
  )
  selectTasks({
    k: key,
  }).then(([task]) => {
    if (task) {
      addBehavior(req, {
        module: 'people',
        msg: `更新提交人员信息 成功 任务:${task.name} 姓名:${name}`,
        data: {
          key,
          taskName: task.name,
          name,
          filename,
          hash,
        },
      })
    }
  })

  res.success()
})
export default router
