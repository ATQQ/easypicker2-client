import { getThemeConfig } from '@sugarat/theme/node'
import { defineConfig } from 'vitepress'
import { La51Plugin } from 'vitepress-plugin-51la'
import Pkg from '../../package.json'

const blogTheme = getThemeConfig({
  search: false,
  blog: false,
  author: '粥里有勺糖',
  themeColor: 'el-blue',
  comment: {
    repo: 'atqq/easypicker2-client',
    repoId: 'MDEwOlJlcG9zaXRvcnkzNTQxNzc0NjA=',
    category: 'Announcements',
    categoryId: 'DIC_kwDOFRxRtM4CUThN',
  },
  footer: {
    copyright: `MIT Licensed | 2019 - ${new Date().getFullYear()} 粥里有勺糖`,
  },
  popover: {
    title: '广而告之',
    body: [
      {
        type: 'image',
        src: '/group.png',
        style: 'width:60%;margin:0 auto;display:block',
      },
      {
        type: 'text',
        content: '欢迎加群交流&吐槽 💐',
      },
      {
        type: 'button',
        content: '关于作者',
        link: '/author.html',
      },
      {
        type: 'button',
        content: '发电⚡',
        props: {
          type: 'success',
        },
        link: '/praise/index.html',
      },
    ],
    duration: 0,
  },
})

export default defineConfig({
  extends: blogTheme,
  ignoreDeadLinks: true,
  title: 'EasyPicker | 轻取',
  description: '在线文件收集平台',
  head: [
    ['meta', { name: 'theme-color', content: '#ffffff' }],
    ['link', { rel: 'icon', href: '/favicon.ico', type: 'image/png' }],
    [
      'link',
      {
        rel: 'alternate icon',
        href: '/favicon.ico',
        type: 'image/png',
        sizes: '16x16',
      },
    ],
    ['meta', { name: 'author', content: '粥里有勺糖' }],
    ['link', { rel: 'mask-icon', href: '/favicon.ico', color: '#ffffff' }],
    [
      'link',
      { rel: 'apple-touch-icon', href: '/favicon.ico', sizes: '180x180' },
    ],
  ],
  vite: {
    server: {
      port: 4000,
      host: '0.0.0.0',
    },
    plugins: [La51Plugin({
      id: 'JiqK2jS5HmnB4s8G',
      ck: 'JiqK2jS5HmnB4s8G',
    })],
  },
  lastUpdated: true,
  themeConfig: {
    // search: {
    //   provider: 'algolia',
    //   options: {
    //     appId: 'GPX84VDH91',
    //     apiKey: '150dda0b943087c4e6a04d54af1d7391',
    //     indexName: 'sugarat',
    //     placeholder: '请输入要搜索的内容...'
    //   }
    // },
    search: {
      provider: 'local',
    },
    lastUpdatedText: '上次更新于',
    logo: '/logo.png',
    editLink: {
      pattern:
        'https://github.com/ATQQ/easypicker2-client/edit/main/docs/:path',
      text: '去 GitHub 上编辑内容',
    },
    nav: [
      {
        text: '私有化部署',
        items: [
          {
            text: '本地启动&源码修改',
            link: '/deploy/local',
          },
          {
            text: '使用docker',
            link: '/deploy/docker',
          },
          {
            text: '线上部署',
            link: '/deploy/online-v3',
          },
          {
            text: '七牛云OSS配置',
            link: '/deploy/qiniu',
          },
          {
            text: '常见问题❓',
            link: '/deploy/faq',
          },
          {
            text: '相关设计',
            link: '/deploy/design/index',
          },
        ],
        activeMatch: '/deploy/',
      },
      {
        text: '功能介绍',
        link: '/introduction/feature/index',
      },
      {
        text: `v${Pkg.version}`,
        items: [
          { text: '⭐️ 需求墙', link: '/plan/wish' },
          { text: '🥔 近期规划', link: '/plan/todo' },
          { text: '📅 更新日志', link: '/plan/log' },
        ],
        activeMatch: '/plan/',
      },
      {
        text: '作者信息',
        link: '/author',
      },
      {
        text: '打赏',
        link: '/praise/index',
      },
      { text: '⭐️ 需求墙', link: '/plan/wish' },
    ],
    sidebar: {
      deploy: [
        {
          text: '私有化部署',
          items: [
            {
              text: 'Getting Started',
              link: '/deploy/',
            },
            {
              text: '本地启动&源码修改',
              link: '/deploy/local',
            },
            {
              text: '使用docker',
              link: '/deploy/docker',
            },
            {
              text: '线上部署 - v3（推荐）',
              link: '/deploy/online-v3',
            },
            {
              text: '线上部署 - v2',
              link: '/deploy/online-new',
            },
            {
              text: '线上部署 - v1',
              link: '/deploy/online',
            },
            {
              text: '接入七牛云OSS服务',
              link: '/deploy/qiniu',
            },
            {
              text: '常见问题❓',
              link: '/deploy/faq',
            },
          ],
        },
        {
          text: '相关设计',
          items: [
            {
              text: '自动部署脚本',
              link: '/deploy/design/shell',
            },
            {
              text: '概述',
              link: '/deploy/design/index',
            },
            {
              text: '数据库设计',
              link: '/deploy/design/db',
            },
            {
              text: '接口设计',
              link: '/deploy/design/api',
            },
          ],
        },
      ],
      plan: [
        {
          text: '应用动态',
          items: [
            {
              text: '⭐️ 需求墙',
              link: '/plan/wish',
            },
            {
              text: '🥔 TODO-LIST',
              link: '/plan/todo',
            },
            {
              text: '更新日志',
              link: '/plan/log',
            },
          ],
        },
      ],
      introduction: [
        {
          text: '关于',
          items: [
            {
              text: '应用介绍',
              link: '/introduction/about/index',
            },
            {
              text: '相关源码',
              link: '/introduction/about/code',
            },
          ],
        },
        {
          text: '功能介绍',
          items: [
            {
              text: '概述',
              link: '/introduction/feature/index',
            },
            {
              text: '管理员功能',

              link: '/introduction/feature/admin',
            },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ATQQ/easypicker2-client' },
    ],
  },
})
