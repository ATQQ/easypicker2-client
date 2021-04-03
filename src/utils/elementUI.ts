import { App } from '@vue/runtime-core'
import { ElButton } from 'element-plus'
import 'element-plus/packages/theme-chalk/src/icon.scss'

const components = [ElButton]
export default function mountElementUI(app: App<Element>) {
  components.forEach((c) => {
    app.component(c.name, c)
  })
}
