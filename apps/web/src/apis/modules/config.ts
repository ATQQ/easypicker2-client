import ajax from '../ajax'

function getServiceOverview(): ConfigServiceAPITypes.getServiceOverview {
  return ajax.get('/config/service/overview')
}

function getMysqlSchema(): ConfigServiceAPITypes.getMysqlSchema {
  return ajax.get('/config/service/mysql/schema')
}

function getMysqlSchemaExportSql(): ConfigServiceAPITypes.getMysqlSchemaExportSql {
  return ajax.get('/config/service/mysql/schema/export-sql')
}

function applyMysqlSchema(): ConfigServiceAPITypes.applyMysqlSchema {
  return ajax.post('/config/service/mysql/schema/apply')
}

function getMysqlLiveIntrospect(): ConfigServiceAPITypes.getMysqlLiveIntrospect {
  return ajax.get('/config/service/mysql/introspect')
}

function checkMysqlDatabase(
  body: ConfigServiceAPITypes.MysqlCheckDatabaseBody,
): ConfigServiceAPITypes.checkMysqlDatabase {
  return ajax.post('/config/service/mysql/check-database', body)
}

function listConfigAdminUsers(): ConfigServiceAPITypes.listConfigAdminUsers {
  return ajax.get('/config/service/admin-users')
}

function createConfigAdminUser(
  body: ConfigServiceAPITypes.CreateConfigAdminUserBody,
): ConfigServiceAPITypes.createConfigAdminUser {
  return ajax.post('/config/service/admin-users', body)
}

function resetConfigAdminUserPassword(
  body: ConfigServiceAPITypes.ResetConfigAdminUserPasswordBody,
): ConfigServiceAPITypes.resetConfigAdminUserPassword {
  return ajax.post('/config/service/admin-users/reset-password', body)
}

function getServiceConfig(): ConfigServiceAPITypes.getServiceConfig {
  return ajax.get('/config/service/config')
}

function updateCfg(data: ConfigServiceAPITypes.ServiceConfigItem | ConfigServiceAPITypes.ServiceConfigItem[]) {
  return ajax.put('/config/service/config', data)
}

export default {
  getServiceOverview,
  getMysqlSchema,
  getMysqlSchemaExportSql,
  applyMysqlSchema,
  getMysqlLiveIntrospect,
  checkMysqlDatabase,
  listConfigAdminUsers,
  createConfigAdminUser,
  resetConfigAdminUserPassword,
  getServiceConfig,
  updateCfg,
}
