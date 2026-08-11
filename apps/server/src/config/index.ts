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
    // eslint-disable-next-line ts/no-require-imports
    const fs = require('node:fs')
    return fs.readFileSync(p, 'utf8')
  }
  catch {
    return ''
  }
}

// 支付宝支付（通过 alipay-service 中转平台完成收款）
// 业务侧仅保留总开关、金额限额与订单参数；真正的支付宝密钥由中转平台持有。
export const alipayConfig = {
  enabled: String(process.env.ALIPAY_ENABLED) === 'true',
  minAmount: Number(process.env.ALIPAY_MIN_AMOUNT ?? 1),
  maxAmount: Number(process.env.ALIPAY_MAX_AMOUNT ?? 5000),
  dailyLimit: Number(process.env.ALIPAY_DAILY_LIMIT ?? 20000),
  orderExpireMinutes: Number(process.env.ALIPAY_ORDER_EXPIRE_MINUTES ?? 30),
}

// 支付宝中转平台（alipay-service）连接配置
export const alipayRelayConfig = {
  enabled: String(process.env.ALIPAY_RELAY_ENABLED) === 'true',
  baseUrl: (process.env.ALIPAY_RELAY_BASE_URL || '').replace(/\/+$/, ''),
  appId: process.env.ALIPAY_RELAY_APP_ID || '',
  appSecret: readSecret(
    process.env.ALIPAY_RELAY_APP_SECRET,
    process.env.ALIPAY_RELAY_APP_SECRET_PATH,
  ),
  notifyPath: process.env.ALIPAY_RELAY_NOTIFY_PATH || '/api/pay/alipay/notify',
  timeoutMs: Number(process.env.ALIPAY_RELAY_TIMEOUT_MS ?? 10000),
}
