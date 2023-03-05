import { ElMessage } from 'element-plus'
import { TaskApi } from '@/apis'
import { debounce } from '@/utils/other'

export const updateTaskInfo: (
  key: string,
  options: TaskApiTypes.TaskInfo,
  successInfo?: boolean
) => void = debounce(
  (key, options, successInfo = true) => {
    if (key) {
      TaskApi.updateTaskMoreInfo(key, options)
        .then(() => {
          if (successInfo) {
            ElMessage.success({
              message: '设置成功',
              zIndex: 4000,
              duration: 1000
            })
          }
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
