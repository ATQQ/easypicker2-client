import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

const instance = axios.create({
  baseURL: import.meta.env.VITE_APP_AXIOS_BASE_URL,
})

/**
 * 请求拦截
 */
instance.interceptors.request.use((config) => {
  const { method, params } = config
  // 附带鉴权的token
  const headers: any = {
    token: localStorage.getItem('token'),
  }
  // 不缓存get请求
  if (method === 'get') {
    headers['Cache-Control'] = 'no-cache'
  }
  // delete请求参数放入body中
  if (method === 'delete') {
    headers['Content-type'] = 'application/json;'
    Object.assign(config, {
      data: params,
      params: {},
    })
  }

  return ({
    ...config,
    headers,
  })
})

// 跳转首页防抖
let redirectHome = true
/**
 * 响应拦截
 */
instance.interceptors.response.use((v) => {
  if (v.status === 200) {
    if (v.data.code === 0) {
      return v.data
    }
    if (v.data?.code === 3004) {
      localStorage.removeItem('token')
      if (redirectHome) {
        redirectHome = false
        ElMessage.error('登录过期,跳转首页')
        router.replace({
          name: 'home',
        })
        setTimeout(() => {
          redirectHome = true
        }, 1000)
      }
    }
    if (v?.data?.code === 500) {
      ElMessage.error(v?.data?.msg)
    }
    return Promise.reject(v.data)
  }
  ElMessage.error(v.statusText)
  return Promise.reject(v)
}, (err) => {
  ElMessage.error(`网络错误：${err}`)
  return Promise.reject(err)
})
export default instance
