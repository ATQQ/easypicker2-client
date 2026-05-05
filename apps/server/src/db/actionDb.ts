import { FilterQuery, UpdateQuery } from 'mongodb'
import {
  findCollection,
  findCollectionCount,
  insertCollection,
  mongoDbQuery,
  updateCollection
} from '@/lib/dbConnect/mongodb'
import { Action, DownloadAction } from './model/action'
import { getUniqueKey } from '@/utils/stringUtil'

export function addAction(action: Partial<Action>) {
  Object.assign<any, Partial<Action>>(action, {
    id: getUniqueKey(),
    date: new Date()
  })
  return insertCollection<any>('action', action)
}
export function addDownloadAction(action: Partial<DownloadAction>) {
  return addAction(action)
}

export function findActionCount(query: FilterQuery<Action>) {
  return findCollectionCount<Action>('action', query)
}

export function findActionWithPageOffset(
  startIdx: number,
  pageSize: number,
  query: FilterQuery<Action>
) {
  return mongoDbQuery<Action[]>((db, resolve) => {
    db.collection<Action>('action')
      .find(query)
      .sort({ _id: -1 })
      .skip(startIdx)
      .limit(pageSize)
      .toArray()
      .then(resolve)
  })
}

export function findAction<T = any>(action: FilterQuery<Action<T>>) {
  return findCollection<Action<T>>('action', action)
}

export function updateAction<T = any>(
  query: FilterQuery<Action<T>>,
  action: UpdateQuery<Action<T>>
) {
  return updateCollection<Action<T>>('action', query, action)
}
