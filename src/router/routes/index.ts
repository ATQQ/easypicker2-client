import { RouteRecordRaw } from 'vue-router'
import Home from '@/pages/home/index.vue'

const NotFind = () => import('@/pages/404/index.vue')
const Login = () => import('@/pages/login/index.vue')
const Register = () => import('@/pages/register/index.vue')
const About = () => import('@/pages/about/index.vue')
const Feedback = () => import('@/pages/feedback/index.vue')
const Dashboard = () => import('@/pages/dashboard/index.vue')
const Files = () => import('@/pages/dashboard/files/index.vue')
const Tasks = () => import('@/pages/dashboard/tasks/index.vue')

const requireLogin = {
  requireLogin: false,
}
const routes: RouteRecordRaw[] = [
  // 404
  { path: '/:pathMatch(.*)*', name: '404', component: NotFind },
  { path: '/', name: 'home', component: Home },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },
  { path: '/about', name: 'about', component: About },
  { path: '/feedback', name: 'feedback', component: Feedback },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: Dashboard,
    redirect: {
      name: 'tasks',
    },
    children: [
      {
        name: 'files',
        path: 'files',
        component: Files,
        meta: requireLogin,
      },
      {
        name: 'tasks',
        path: 'tasks',
        component: Tasks,
        meta: requireLogin,
      },
    ],
  },
]
export default routes
