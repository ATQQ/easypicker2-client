import { ElMessage } from 'element-plus'
import { TaskApi } from '@/apis'
import { debounce } from '@/utils/other'

export const updateTaskInfo: (
  key: string,
  options: TaskApiTypes.TaskInfo
) => void = debounce(
  (key, options) => {
    if (key) {
      TaskApi.updateTaskMoreInfo(key, options)
        .then(() => {
          ElMessage.success({
            message: '设置成功',
            zIndex: 4000,
            duration: 1000
          })
        })
        .catch(() => {
          ElMessage.error({
            message: '设置失败',
            zIndex: 4000
          })
        })
    }
  },
  1000,
  true
)
