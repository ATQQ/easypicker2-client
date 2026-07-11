import fs from 'node:fs'

export const serverConfig = {
  port: +process.env.SERVER_PORT,
  hostname: process.env.SERVER_HOST,
}

// 开发环境的测试数据库
export const mysqlConfig = {
  host: process.env.MYSQL_DB_HOST,
  port: +process.env.MYSQL_DB_PORT,
  database: process.env.MYSQL_DB_NAME,
  user: process.env.MYSQL_DB_USER,
  password: process.env.MYSQL_DB_PWD,
  /** 与 utf8mb4 列一致，避免直连 SQL / 迁移写入 4 字节字符失败 */
  charset: 'utf8mb4',
}

export const mongodbConfig = {
  host: process.env.MONGO_DB_HOST,
  port: +process.env.MONGO_DB_PORT,
  database: process.env.MONGO_DB_NAME,
  user: process.env.MONGO_DB_USER,
  password: process.env.MONGO_DB_PWD,
  auth: String(true) === process.env.MONGO_DB_NEED_AUTH,
}

export const redisConfig = {
  host: process.env.REDIS_DB_HOST,
  port: +process.env.REDIS_DB_PORT,
  password: process.env.REDIS_DB_PASSWORD,
  auth: String(true) === process.env.REDIS_DB_NEED_AUTH,
}

export const kvStoreConfig = {
  driver: process.env.KV_STORE === 'redis' ? 'redis' : 'local',
  dir: process.env.KV_STORE_DIR || `${process.cwd()}/data/kv`,
}

// 通过环境变量注入

export const qiniuConfig = {
  accessKey: process.env.QINIU_ACCESS_KEY,
  secretKey: process.env.QINIU_SECRET_KEY,
  bucketName: process.env.QINIU_BUCKET_NAME,
  bucketDomain: process.env.QINIU_BUCKET_DOMAIN,
  imageCoverStyle:
    process.env.QINIU_BUCKET_IMAGE_COVER_STYLE === 'false'
      ? ''
      : process.env.QINIU_BUCKET_IMAGE_COVER_STYLE,
  imagePreviewStyle:
    process.env.QINIU_BUCKET_IMAGE_PREVIEW_STYLE === 'false'
      ? ''
      : process.env.QINIU_BUCKET_IMAGE_PREVIEW_STYLE,
  bucketZone: process.env.QINIU_BUCKET_ZONE,
}

// 腾讯云
export const txConfig = {
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY,
  templateId: process.env.TENCENT_MESSAGE_TemplateID,
  smsSdkAppid: process.env.TENCENT_MESSAGE_SmsSdkAppid,
  signName: process.env.TENCENT_MESSAGE_SignName,
}

function readSecret(inline?: string, filePath?: string): string {
  const raw = (inline || '').trim()
  if (raw) {
    return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw
  }
  const p = (filePath || '').trim()
  if (!p)
    return ''
  try {
    return fs.readFileSync(p, 'utf8')
  }
  catch {
    return ''
  }
}

// 支付宝支付（纯环境变量驱动，默认关闭）
export const alipayConfig = {
  enabled: String(process.env.ALIPAY_ENABLED) === 'true',
  env: process.env.ALIPAY_ENV === 'production' ? 'production' : 'sandbox',
  appId: process.env.ALIPAY_APP_ID || '',
  signType: process.env.ALIPAY_SIGN_TYPE || 'RSA2',
  appPrivateKey: readSecret(
    process.env.ALIPAY_APP_PRIVATE_KEY,
    process.env.ALIPAY_APP_PRIVATE_KEY_PATH,
  ),
  alipayPublicKey: readSecret(
    process.env.ALIPAY_PUBLIC_KEY,
    process.env.ALIPAY_PUBLIC_KEY_PATH,
  ),
  notifyUrl: process.env.ALIPAY_NOTIFY_URL || '',
  returnUrl: process.env.ALIPAY_RETURN_URL || '',
  sellerId: process.env.ALIPAY_SELLER_ID || '',
  minAmount: Number(process.env.ALIPAY_MIN_AMOUNT ?? 1),
  maxAmount: Number(process.env.ALIPAY_MAX_AMOUNT ?? 5000),
  dailyLimit: Number(process.env.ALIPAY_DAILY_LIMIT ?? 20000),
  orderExpireMinutes: Number(process.env.ALIPAY_ORDER_EXPIRE_MINUTES ?? 30),
}
