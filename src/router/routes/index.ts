import { RouteRecordRaw } from 'vue-router'
import Home from '@/pages/home/index.vue'
import Login from '@/pages/login/index.vue'
import Register from '@/pages/register/index.vue'
// import Wish from '@/pages/wish/index.vue'

const NotFind = () => import('@/pages/404/index.vue')
const Reset = () => import('@/pages/reset/index.vue')
const About = () => import('@/pages/about/index.vue')
const Author = () => import('@/pages/callme/index.vue')
const Feedback = () => import('@/pages/feedback/index.vue')
const Dashboard = () => import('@/pages/dashboard/index.vue')
const Files = () => import('@/pages/dashboard/files/index.vue')
const Config = () => import('@/pages/dashboard/config/index.vue')
const Tasks = () => import('@/pages/dashboard/tasks/index.vue')
const Manage = () => import('@/pages/dashboard/manage/index.vue')
const Overview = () => import('@/pages/dashboard/manage/overview/index.vue')
const User = () => import('@/pages/dashboard/manage/user/index.vue')
const Wish = () => import('@/pages/dashboard/manage/wish/index.vue')
const Task = () => import('@/pages/task/index.vue')
const Disabled = () => import('@/pages/disabled/index.vue')
const DashboardConfig = () =>
  import('@/pages/dashboard/manage/config/index.vue')

const routes: RouteRecordRaw[] = [
  // 404
  {
    path: '/:pathMatch(.*)*',
    name: '404',
    component: NotFind,
    meta: {
      title: '404'
    }
  },
  {
    path: '/disabled',
    name: 'disable',
    component: Disabled
  },
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {
      title: '首页',
      allowDisabled: true
    }
  },
  // {
  //   path: '/wish',
  //   name: 'wish',
  //   component: Wish,
  //   meta: {
  //     title: '需求墙',
  //   },
  // },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: {
      title: '登录'
    }
  },
  {
    path: '/register',
    name: 'register',
    component: Register,
    meta: {
      title: '注册',
      allowDisabled: true
    }
  },
  {
    path: '/reset',
    name: 'reset',
    component: Reset,
    meta: {
      title: '找回密码',
      allowDisabled: true
    }
  },
  {
    path: '/about',
    name: 'about',
    component: About,
    meta: {
      title: '关于'
    }
  },
  {
    path: '/author',
    name: 'author',
    component: Author,
    meta: {
      title: '联系作者'
    }
  },
  {
    path: '/feedback',
    name: 'feedback',
    component: Feedback,
    meta: {
      title: '建议反馈'
    }
  },
  {
    path: '/task/:key',
    name: 'task',
    component: Task,
    meta: {
      title: '文件提交'
    }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: Dashboard,
    redirect: {
      name: 'tasks'
    },
    children: [
      {
        name: 'config',
        path: 'config',
        component: Config,
        meta: {
          title: '服务状态维护',
          isSystem: true
        }
      },
      {
        name: 'files',
        path: 'files',
        component: Files,
        meta: {
          title: '文件列表'
        }
      },
      {
        name: 'tasks',
        path: 'tasks',
        component: Tasks,
        meta: {
          title: '任务列表'
        }
      },
      {
        name: 'manage',
        path: 'manage',
        component: Manage,
        redirect: {
          name: 'overview'
        },
        children: [
          {
            name: 'overview',
            path: 'overview',
            component: Overview,
            meta: {
              title: '应用概况',
              isAdmin: true
            }
          },
          {
            name: 'user',
            path: 'user',
            component: User,
            meta: {
              title: '用户列表',
              isAdmin: true
            }
          },
          {
            name: 'wish',
            path: 'wish',
            component: Wish,
            meta: {
              title: '需求管理',
              isAdmin: true
            }
          },
          {
            name: 'dashboard-config',
            path: 'config',
            component: DashboardConfig,
            meta: {
              title: '配置面板',
              isAdmin: true
            }
          }
        ]
      }
    ]
  }
]
export default routes
