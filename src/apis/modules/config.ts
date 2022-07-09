import ajax from '../ajax'

function getServiceOverview():ConfigServiceAPITypes.getServiceOverview {
  return ajax.get(
    '/config/service/overview',
  )
}

export default {
  getServiceOverview,
}
