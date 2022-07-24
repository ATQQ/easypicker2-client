import ajax from '../ajax'

function getServiceOverview():ConfigServiceAPITypes.getServiceOverview {
  return ajax.get(
    '/config/service/overview',
  )
}

function getServiceConfig():ConfigServiceAPITypes.getServiceConfig {
  return ajax.get(
    '/config/service/config',
  )
}

function updateCfg(data:ConfigServiceAPITypes.ServiceConfigItem) {
  return ajax.put(
    '/config/service/config',
    data,
  )
}

export default {
  getServiceOverview,
  getServiceConfig,
  updateCfg,
}
