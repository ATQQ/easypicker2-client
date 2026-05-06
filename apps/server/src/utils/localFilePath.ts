import path from 'node:path'
import { uploadFileDir } from '@/constants'

/** 与七牛 object key 一致的相对路径（POSIX） */
export function localObjectRelPath(taskKey: string, hash: string, filename: string) {
  return `easypicker2/${taskKey}/${hash}/${filename}`
}

export function localObjectAbsPath(relPath: string) {
  return path.join(uploadFileDir, ...relPath.split('/'))
}
