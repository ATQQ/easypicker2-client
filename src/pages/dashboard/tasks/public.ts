import { ElMessage } from 'element-plus'
import { TaskApi } from '@/apis'

export const updateTaskInfo = (key:string, options: TaskApiTypes.TaskInfo) => {
  if (key) {
    TaskApi
      .updateTaskMoreInfo(key, options)
      .then(() => {
        ElMessage.success({
          message: '设置成功',
          zIndex: 4000,
        })
      })
      .catch(() => {
        ElMessage.error({
          message: '设置失败',
          zIndex: 4000,
        })
      })
  }
}
