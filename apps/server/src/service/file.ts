import { File } from '@/db/model/file'

class FileService {
  getOssKey(file: File) {
    return `easypicker2/${file.task_key || file.taskKey}/${file.hash}/${
      file.name
    }`
  }
}

export default new FileService()
