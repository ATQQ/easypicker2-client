/* eslint-disable regexp/no-unused-capturing-group */
/* eslint-disable regexp/no-legacy-features */
import type { FWRequest } from 'flash-wolves'
import crypto from 'node:crypto'
import path from 'node:path'
import { ObjectId } from 'mongodb'
/**
 * 加密字符串(md5+base64)
 * @param str 待加密的字符串
 */
export function encryption(str: string): string {
  return crypto.createHash('md5').update(str).digest('base64')
}

export function lowCamel2Underscore(word: string): string {
  const letters = word.split('')
  return letters.reduce(
    (pre, letter) =>
      pre + (/[A-Z]/.test(letter) ? `_${letter.toLowerCase()}` : letter),
    '',
  )
}

export function getUniqueKey() {
  return new ObjectId().toHexString()
}

/** 将用户输入转义后用于 MongoDB `$regex`，避免特殊字符导致全表扫描或 ReDoS */
export function escapeRegexForMongo(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function timeToObjId(d: Date) {
  const seconds = Math.floor(d.getTime() / 1000) // Mongo ObjectId 的时间戳精度为秒
  return `${seconds.toString(16).padStart(8, '0')}0000000000000000`
}

export function getKeyInfo(key: string) {
  const { name, base, ext } = path.parse(key)
  return {
    name,
    base,
    ext,
  }
}
export function formatDate(d: Date, fmt = 'yyyy-MM-dd hh:mm:ss') {
  const o: any = {
    'M+': d.getMonth() + 1, // 月份
    'd+': d.getDate(), // 日
    'h+': d.getHours(), // 小时
    'm+': d.getMinutes(), // 分
    's+': d.getSeconds(), // 秒
    'q+': Math.floor((d.getMonth() + 3) / 3), // 季度
    'S': d.getMilliseconds(), // 毫秒
  }
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,
      `${d.getFullYear()}`.substr(4 - RegExp.$1.length),
    )
  }

  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? o[k] : `00${o[k]}`.substr(`${o[k]}`.length),
      )
    }
  }
  return fmt
}

export function formatSize(
  size: number,
  pointLength?: number,
  units?: string[],
) {
  let unit
  units = units || ['B', 'K', 'M', 'G', 'TB', 'PB']
  // eslint-disable-next-line no-cond-assign
  while ((unit = units.shift()) && size > 1024) {
    size /= 1024
  }
  return (
    (unit === 'B'
      ? size
      : size.toFixed(pointLength === undefined ? 2 : pointLength)) + unit
  )
}

export function B2GB(size: number) {
  return size / 1024 / 1024 / 1024
}

export function formatPrice(...prices: number[]) {
  return prices.reduce((pre, cur) => pre + cur, 0).toFixed(2)
}

type InfoItemType = 'input' | 'radio' | 'text' | 'select'
type InfoInput = string | InfoItem[] | unknown | null | undefined

function normalizeInfoItems(v: InfoInput): InfoItem[] {
  if (v === null || v === undefined)
    return []
  if (Array.isArray(v))
    return v as InfoItem[]
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed : []
    }
    catch {
      return []
    }
  }
  return []
}

export interface InfoItem {
  type?: InfoItemType
  // 描述信息
  text?: string
  // 表单项的值
  value?: string
  children?: InfoItem[]
}

export function isSameInfo(userInfo: InfoInput, dbInfo: InfoInput) {
  try {
    const userItems = normalizeInfoItems(userInfo)
    const dbItems = normalizeInfoItems(dbInfo)
    if (userItems.length === 0) {
      return false
    }
    if (userItems.length !== dbItems.length) {
      return false
    }
    if (
      !dbItems.every(item =>
        userItems.find(
          userItem =>
            userItem.text === item.text && userItem.value === item.value,
        ),
      )
    ) {
      return false
    }
  }
  catch (error) {
    console.log(error)
    return false
  }
  return true
}

/**
 * 文件名合法化
 */
export function normalizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '-')
}

export function getObjectIdDate(id: string) {
  return +new ObjectId(id).getTimestamp()
}

export function getTipImageKey(
  key: string,
  name: string,
  uid?: number | string,
) {
  return `easypicker2/tip/${key}/${uid || Date.now()}/${name}`
}

export function shortLink(key: string, req: FWRequest) {
  return `${new URL(req.headers.referer).origin}/api/file/download/${key}`
}

/**
 * A/B百分比值
 * @param A
 * @param B
 */
export function percentageValue(A: number, B: number) {
  return ((A / B) * 100).toFixed(2)
}
