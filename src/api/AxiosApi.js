import axios from 'axios'
import { Message, MessageBox } from 'element-ui'
import db from '@/utils/localstorage'
import { Base64 } from 'js-base64'

// 请求添加条件，如token
axios.interceptors.request.use(
  config => {
    const isToken = config.headers['X-isToken'] === false ? config.headers['X-isToken'] : true
    const token = db.get('TOKEN', '')
    if (token && isToken) {
      config.headers.token = 'Bearer ' + token
    }

    const clientId = process.env.VUE_APP_CLIENT_ID
    const clientSecret = process.env.VUE_APP_CLIENT_SECRET
    config.headers['Authorization'] = `Basic ${Base64.encode(`${clientId}:${clientSecret}`)}`
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 接口返回处理
axios.interceptors.response.use(
  response => {
    return response
  },
  error => {
    return Promise.reject(error)
  }
)

function handleError (error, reject) {
  if (error.code === 'ECONNABORTED') {
    debugger
    Message({
      message: '请求超时'
    })
  } else if (error.response && error.response.data) {
    Message({
      message: error.response.data.msg
    })
  } else if (error.message) {
    Message({
      message: error.message
    })
  }
  reject(error)
}

function handleSuccess (res, resolve) {
  if (res.data.isError) {
    // 未登录
    debugger
    if (res.data.code === 40000 || res.data.code === 40001 ||
      res.data.code === 40002 || res.data.code === 40003 ||
      res.data.code === 40005 || res.data.code === 40006 ||
      res.data.code === 40008) {
      MessageBox.alert(res.data.msg, '提醒', {
        confirmButtonText: '确定',
        callback: () => {
          window.location.hash = '/login'
        }
      })
    } else {
      Message.error(res.data.msg)
    }
  }
  resolve(res)
}

// http请求
const httpServer = (opts) => {
  // 公共参数
  const publicParams = {
    ts: Date.now()
  }

  // http默认配置
  const method = opts.method.toUpperCase()
  // baseURL
  // 开发环境： /api                 // 开发环境在 vue.config.js 中有 devServer.proxy 代理
  // 生产环境： http://IP:PORT/api   // 生产环境中 代理失效， 故需要配置绝对路径
  const httpDefaultOpts = {
    method,
    baseURL: process.env.VUE_APP_PROD_REQUEST_DOMAIN_PREFIX + process.env.VUE_APP_BASE_API,
    url: opts.url,
    responseType: opts.responseType || '',
    timeout: 20000
  }
  const dataRequest = ['PUT', 'POST', 'PATCH']
  if (dataRequest.includes(method)) {
    httpDefaultOpts.data = opts.data || {}
  } else {
    httpDefaultOpts.params = {
      ...publicParams,
      ...(opts.data || {})
    }
  }

  // formData转换
  if (opts.formData) {
    httpDefaultOpts.transformRequest = [data => {
      const formData = new FormData()
      if (data) {
        Object.entries(data).forEach(item => {
          formData.append(item[0], item[1])
        })
      }
      return formData
    }]
  }

  const promise = new Promise((resolve, reject) => {
    axios(httpDefaultOpts).then(response => {
      handleSuccess(response, resolve)
    }).catch(error => {
      handleError(error, reject)
    })
  })
  return promise
}

export default httpServer
