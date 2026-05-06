import LocalUserDB from './user-local-db'
import { isSmtpConfigured } from './mail'

const txRequiredKeys = [
  'secretId',
  'secretKey',
  'templateId',
  'smsSdkAppid',
  'signName',
]

function hasValidConfigValue(value: unknown) {
  return typeof value === 'string'
    ? value.trim() !== '' && value !== '******'
    : value !== undefined && value !== null
}

export function isTxMessageConfigured() {
  const txConfig = LocalUserDB.getUserConfigByType('tx')
  return txRequiredKeys.every(key => hasValidConfigValue(txConfig[key]))
}

export function isCodeLoginSupported() {
  return Boolean(LocalUserDB.getSiteConfig()?.enableCodeLogin) && isTxMessageConfigured()
}

export function isEmailCodeLoginSupported() {
  return Boolean(LocalUserDB.getSiteConfig()?.enableEmailCodeLogin) && isSmtpConfigured()
}
