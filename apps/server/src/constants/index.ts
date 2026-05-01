export interface CodeMsg {
  code: number
  msg: string
}
export function codeMsg(code: number, msg: string): CodeMsg {
  return {
    code,
    msg
  }
}

export const uploadFileDir = `${process.cwd()}/upload`

export const UserConfigLabels = {
  tx: {
    secretId: 'SecretId',
    secretKey: 'SecretKey',
    templateId: '短信模板ID',
    smsSdkAppid: '短信应用appid',
    signName: '短信签名'
  },
  mysql: {
    host: '主机地址',
    port: '端口号',
    database: '数据库名',
    user: '用户名',
    password: '密码'
  },
  qiniu: {
    accessKey: 'AccessKey',
    secretKey: 'SecretKey',
    bucketName: '存储空间名',
    bucketDomain: '绑定的域名',
    imageCoverStyle: '图片封面压缩样式',
    imagePreviewStyle: '图片预览压缩样式',
    bucketZone: '存储空间区域'
  },
  mongo: {
    host: '主机地址',
    port: '端口号',
    database: '数据库名',
    user: '用户名',
    password: '密码',
    auth: '是否需要鉴权'
  }
}

export const LocalEnvMap = {
  mysql: {
    host: 'MYSQL_DB_HOST',
    port: 'MYSQL_DB_PORT',
    database: 'MYSQL_DB_NAME',
    user: 'MYSQL_DB_USER',
    password: 'MYSQL_DB_PWD'
  },
  mongo: {
    host: 'MONGO_DB_HOST',
    port: 'MONGO_DB_PORT',
    database: 'MONGO_DB_NAME',
    user: 'MONGO_DB_USER',
    password: 'MONGO_DB_PWD',
    auth: 'MONGO_DB_NEED_AUTH'
  },
  redis: {
    host: 'REDIS_DB_HOST',
    port: 'REDIS_DB_PORT',
    password: 'REDIS_DB_PASSWORD',
    auth: 'REDIS_DB_NEED_AUTH'
  },
  qiniu: {
    accessKey: 'QINIU_ACCESS_KEY',
    secretKey: 'QINIU_SECRET_KEY',
    bucketName: 'QINIU_BUCKET_NAME',
    bucketDomain: 'QINIU_BUCKET_DOMAIN',
    imageCoverStyle: 'QINIU_BUCKET_IMAGE_COVER_STYLE',
    imagePreviewStyle: 'QINIU_BUCKET_IMAGE_PREVIEW_STYLE',
    bucketZone: 'QINIU_BUCKET_ZONE'
  },
  tx: {
    secretId: 'TENCENT_SECRET_ID',
    secretKey: 'TENCENT_SECRET_KEY',
    templateId: 'TENCENT_MESSAGE_TemplateID',
    smsSdkAppid: 'TENCENT_MESSAGE_SmsSdkAppid',
    signName: 'TENCENT_MESSAGE_SignName'
  }
}
