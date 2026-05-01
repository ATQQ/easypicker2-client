import { Router } from 'flash-wolves'
import { publicError } from '@/constants/errorMsg'
import {
  deleteFileRecord,
  deleteFiles,
  insertFile,
  selectFiles,
} from '@/db/fileDb'
import { addBehavior, addErrorLog } from '@/db/logDb'
import type { File } from '@/db/model/file'
import { selectPeople, updatePeople } from '@/db/peopleDb'
import { selectTasks } from '@/db/taskDb'

import {
  batchDeleteFiles,
  checkFopTaskStatus,
  createDownloadUrl,
  deleteObjByKey,
  getUploadToken,
  judgeFileIsExist,
} from '@/utils/qiniuUtil'
import { isSameInfo, normalizeFileName } from '@/utils/stringUtil'
import { getQiniuFileUrlExpiredTime, getUserInfo } from '@/utils/userUtil'
import { selectTaskInfo } from '@/db/taskInfoDb'

const router = new Router('file')

/**
 * 查询是否提交
 */
router.post('submit/people', async (req, res) => {
  const { taskKey, info, name = '' } = req.body

  let files = await selectFiles(
    {
      taskKey,
      people: name,
    },
    ['id', 'info'],
  )
  files = files.filter(v => isSameInfo(v.info, JSON.stringify(info)))
  ;(async () => {
    const [task] = await selectTasks({
      k: taskKey,
    })
    if (task) {
      addBehavior(req, {
        module: 'file',
        msg: `查询是否提交过文件: ${files.length > 0 ? '是' : '否'} 任务:${
          task.name
        } 数量:${files.length}`,
        data: {
          taskKey,
          taskName: task.name,
          info,
          count: files.length,
        },
      })
    }
    else {
      addBehavior(req, {
        module: 'file',
        msg: `查询是否提交过文件: 任务 ${taskKey} 不存在`,
        data: {
          taskKey,
          taskName: task.name,
          info,
        },
      })
    }
  })()

  res.success({
    isSubmit: files.length > 0,
    txt: '',
  })
})
export default router
