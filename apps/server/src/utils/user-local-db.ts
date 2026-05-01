import fs, { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type { UserConfig, UserConfigType } from '@/db/model/config'
import { LocalEnvMap } from '@/constants'
import type { GlobalSiteConfig } from '@/types'

const JSONDbFile = path.join(process.cwd(), 'user-config.json')

export default class LocalUserDB {
  private static data: UserConfig[] = []

  static async initUserConfig() {
    if (!existsSync(JSONDbFile)) {
      await fs.promises.writeFile(JSONDbFile, '[]', 'utf-8')
      this.data = []
      return
    }
    try {
      this.data = JSON.parse(await fs.promises.readFile(JSONDbFile, 'utf-8'))
    }
    catch (error) {
      this.data = []
      console.log('❌ user-config.json 配置文件解析失败, 已重置为默认配置')
      await fs.promises.writeFile(JSONDbFile, '[]', 'utf-8')
    }
  }

  static async updateLocalEnv() {
    const localEnvFile = `${process.cwd()}/.env.local`
    const isExist = fs.existsSync(localEnvFile)
    let content = ''
    if (isExist) {
      content = await fs.promises.readFile(localEnvFile, 'utf-8')
    }
    this.data.forEach((item) => {
      const { type, key, value } = item
      const originEnvKey = LocalEnvMap?.[type]?.[key]
      if (!originEnvKey) {
        return
      }
      if (process.env[originEnvKey] !== `${value}`) {
        content = content.replace(new RegExp(`${originEnvKey}=.*`), '')
        content += `\n${originEnvKey}=${value}`
      }
    })
    content = content.split('\n').filter(Boolean).join('\n')
    await fs.promises.writeFile(localEnvFile, content, 'utf-8')
  }

  static updateCfg() {
    return fs.promises.writeFile(
      JSONDbFile,
      JSON.stringify(this.data, null, 2),
      'utf-8',
    )
  }

  static addUserConfigData(data: UserConfig) {
    this.data.push(data)
  }

  static findUserConfig(query: Partial<UserConfig>) {
    return this.data.filter(item =>
      Object.keys(query).every(key => item[key] === query[key]),
    )
  }

  static updateUserConfig(
    query: Partial<UserConfig>,
    data: Partial<UserConfig>,
  ) {
    const index = this.data.findIndex(item =>
      Object.keys(query).every(key => item[key] === query[key]),
    )
    if (index > -1) {
      this.data[index] = { ...this.data[index], ...data }
      return this.updateCfg()
    }
  }

  static getUserConfigByType(type: UserConfigType): Record<string, any> {
    return this.findUserConfig({ type }).reduce((prev, curr) => {
      prev[curr.key] = curr.value
      return prev
    }, {})
  }

  static getSiteConfig() {
    return this.findUserConfig({ type: 'global', key: 'site' })[0]?.value as GlobalSiteConfig
  }
}
