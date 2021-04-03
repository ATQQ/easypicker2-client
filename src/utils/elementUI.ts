import { App } from '@vue/runtime-core'
import { ElButton } from 'element-plus'

const components = [ElButton]
export default function mountElementUI(app: App<Element>) {
  components.forEach((c) => {
    app.component(c.name, c)
  })
}
