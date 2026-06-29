import type { OkPacket } from 'mysql'
import type { TaskInfo } from './model/taskInfo'
import { Provide } from 'flash-wolves'
import { query } from '@/lib/dbConnect/mysql'
import {
  insertTableByModel,
  selectTableByModel,
  updateTableByModel,
} from '@/utils/sqlUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { AppDataSource, BaseRepository } from '.'
import { TaskInfo as TaskInfoEntity } from './entity'
import { BOOLEAN } from './model/public'

export function selectTaskInfo(
  options: V2Array<TaskInfo>,
  columns: string[] = [],
) {
  const { sql, params } = selectTableByModel('task_info', {
    data: options,
    columns,
  })
  return query<TaskInfo[]>(sql, ...params)
}

export function insertTaskInfo(taskInfo: TaskInfo) {
  const data: TaskInfo = {
    limitPeople: BOOLEAN.FALSE,
    template: '',
    rewrite: BOOLEAN.FALSE,
    format: '',
    info: JSON.stringify(['姓名']),
    shareKey: getUniqueKey(),
    ddl: null,
    viewEnabled: BOOLEAN.FALSE,
    viewPassword: null,
    viewVisibleFields: null,
    viewShowUnsubmitted: BOOLEAN.TRUE,
    viewShowFileNames: BOOLEAN.FALSE,
    ...taskInfo,
  }
  const { sql, params } = insertTableByModel('task_info', data)
  return query<OkPacket>(sql, ...params)
}

export function updateTaskInfo(taskInfo: TaskInfo, q: TaskInfo) {
  const { sql, params } = updateTableByModel('task_info', taskInfo, q)
  return query<OkPacket>(sql, ...params)
}

@Provide()
export class TaskInfoRepository extends BaseRepository<TaskInfoEntity> {
  protected createRepository() {
    return AppDataSource.getRepository(TaskInfoEntity)
  }

  protected entityName = TaskInfoEntity.name

  // 这里存放独有方法
}
