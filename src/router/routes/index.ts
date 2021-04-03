import { RouteRecordRaw } from 'vue-router'
import Home from '@/pages/home/index.vue'

const NotFind = () => import('@/pages/404/index.vue')
const Login = () => import('@/pages/login/index.vue')
const Register = () => import('@/pages/register/index.vue')
const About = () => import('@/pages/about/index.vue')
const Feedback = () => import('@/pages/feedback/index.vue')

const routes: RouteRecordRaw[] = [
  // 404
  { path: '/:pathMatch(.*)*', name: '404', component: NotFind },
  { path: '/', name: 'home', component: Home },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },
  { path: '/about', name: 'about', component: About },
  { path: '/feedback', name: 'feedback', component: Feedback },
]
// children: [
// { path: 'login', component: Login, name: 'login' },
// { path: 'about', component: About, name: 'about' },
// { path: 'axios', component: Axios, name: 'axios' },
// { path: 'element', component: Element, name: 'element' },
// {
//   path: 'dynamic/:id',
//   component: Dynamic,
//   meta: {
//     requireLogin: false,
//     isAdmin: true,
//   },
//   name: 'dynamic',
// },
// ],
export default routes
