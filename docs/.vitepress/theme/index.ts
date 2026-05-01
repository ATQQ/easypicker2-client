import BlogTheme from '@sugarat/theme'
import { ID_INJECTION_KEY } from 'element-plus'

import './index.scss'
import 'element-plus/dist/index.css'

export default {
  extends: BlogTheme,
  enhanceApp(ctx) {
    BlogTheme.enhanceApp?.(ctx)
    ctx.app.provide(ID_INJECTION_KEY, {
      prefix: 1024,
      current: 0,
    })
  },
}
