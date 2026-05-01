import type { App } from '@vue/runtime-core'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'

export default function mountElementUI(app: App<Element>) {
  app.use(ElementPlus, { locale: zhCn })
}
