import { FilterQuery, UpdateQuery } from 'mongodb'
import {
  findCollection,
  insertCollection,
  updateCollection
} from '@/lib/dbConnect/mongodb'
import { UserConfig, UserConfigType } from './model/config'

export function addUserConfigData(cfg: UserConfig) {
  cfg.lastUpdate = new Date()
  return insertCollection<UserConfig>('user-config', cfg)
}

export function findUserConfig(cfg: FilterQuery<UserConfig>) {
  return findCollection<UserConfig>('user-config', cfg)
}

export function updateUserConfig(
  query: FilterQuery<UserConfig>,
  cfg: UpdateQuery<UserConfig>
) {
  return updateCollection<UserConfig>('user-config', query, cfg)
}

export function getUserConfigByType(
  type: UserConfigType
): Promise<Record<string, any>> {
  return findUserConfig({ type }).then((res) =>
    res.reduce((prev, curr) => {
      prev[curr.key] = curr.value
      return prev
    }, {})
  )
}
