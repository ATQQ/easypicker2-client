import type { OkPacket } from 'mysql'
import type { Task } from './model/task'
import { Provide } from 'flash-wolves'
import { query } from '@/lib/dbConnect/mysql'
import {
  deleteTableByModel,
  insertTableByModel,
  selectTableByModel,
  updateTableByModel,
} from '@/utils/sqlUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { AppDataSource, BaseRepository } from '.'
import { Task as TaskEntity } from './entity'
import { insertTaskInfo } from './taskInfoDb'

export function insertTask(task: Task) {
  const data = { k: getUniqueKey(), ...task }
  const { sql, params } = insertTableByModel('task', data)
  // 新增附加属性
  insertTaskInfo({
    taskKey: data.k,
    userId: data.userId,
  })
  return query<OkPacket>(sql, ...params)
}

export function selectTasks(options: V2Array<Task>, columns: string[] = []) {
  const { sql, params } = selectTableByModel('task', {
    data: options,
    columns,
  })
  return query<Task[]>(sql, ...params)
}

export function deleteTask(task: Task) {
  const { sql, params } = deleteTableByModel('task', task)
  return query<OkPacket>(sql, ...params)
}

export function updateTask(task: Task, q: Task) {
  const { sql, params } = updateTableByModel('task', task, q)
  return query<OkPacket>(sql, ...params)
}

@Provide()
export class TaskRepository extends BaseRepository<TaskEntity> {
  protected createRepository() {
    return AppDataSource.getRepository(TaskEntity)
  }

  protected entityName = TaskEntity.name
}
