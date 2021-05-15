import { TaskApi } from '@/apis'
import { ElMessage } from 'element-plus'

export const updateTaskInfo = (key:string, options: TaskApiTypes.TaskInfo) => {
  if (key) {
    TaskApi
      .updateTaskMoreInfo(key, options)
      .then(() => {
        ElMessage.success('设置成功')
      })
      .catch(() => {
        ElMessage.error('设置失败')
      })
  }
}
