export const serverConfig = {
  port: +process.env.SERVER_PORT,
  hostname: process.env.SERVER_HOST
}

// 开发环境的测试数据库
export const mysqlConfig = {
  host: process.env.MYSQL_DB_HOST,
  port: +process.env.MYSQL_DB_PORT,
  database: process.env.MYSQL_DB_NAME,
  user: process.env.MYSQL_DB_USER,
  password: process.env.MYSQL_DB_PWD
}

export const mongodbConfig = {
  host: process.env.MONGO_DB_HOST,
  port: +process.env.MONGO_DB_PORT,
  database: process.env.MONGO_DB_NAME,
  user: process.env.MONGO_DB_USER,
  password: process.env.MONGO_DB_PWD,
  auth: String(true) === process.env.MONGO_DB_NEED_AUTH
}

export const redisConfig = {
  host: process.env.REDIS_DB_HOST,
  port: +process.env.REDIS_DB_PORT,
  password: process.env.REDIS_DB_PASSWORD,
  auth: String(true) === process.env.REDIS_DB_NEED_AUTH
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
  bucketZone: process.env.QINIU_BUCKET_ZONE
}

// 腾讯云
export const txConfig = {
  secretId: process.env.TENCENT_SECRET_ID,
  secretKey: process.env.TENCENT_SECRET_KEY,
  templateId: process.env.TENCENT_MESSAGE_TemplateID,
  smsSdkAppid: process.env.TENCENT_MESSAGE_SmsSdkAppid,
  signName: process.env.TENCENT_MESSAGE_SignName
}
