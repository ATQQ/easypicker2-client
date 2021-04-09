import { App } from '@vue/runtime-core'
import { ElButton, ElInput } from 'element-plus'
import 'element-plus/packages/theme-chalk/src/icon.scss'

const components = [ElButton, ElInput]
export default function mountElementUI(app: App<Element>) {
  components.forEach((c) => {
    app.component(c.name, c)
  })
}
