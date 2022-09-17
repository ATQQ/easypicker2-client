import { defineConfig } from 'vitepress'
import Pkg from './../../package.json'
export default defineConfig({
    title: 'EasyPicker | 轻取',
    description: '在线文件收集平台',
    head: [
        ['meta', { name: 'theme-color', content: '#ffffff' }],
        ['link', { rel: 'icon', href: '/favicon.ico', type: 'image/png' }],
        ['link', { rel: 'alternate icon', href: '/favicon.ico', type: 'image/png', sizes: '16x16' }],
        ['meta', { name: 'author', content: '粥里有勺糖' }],
        ['link', { rel: 'mask-icon', href: '/favicon.ico', color: '#ffffff' }],
        ['link', { rel: 'apple-touch-icon', href: '/favicon.ico', sizes: '180x180' }],
        ['script', { charset: 'UTF-8', id: 'LA_COLLECT', src: '//sdk.51.la/js-sdk-pro.min.js' }],
        ['script', {}, 'LA.init({id: "JiqK2jS5HmnB4s8G",ck: "JiqK2jS5HmnB4s8G",hashMode:true})'],
    ],
    vite: {
        server: {
            port: 4000,
            host: '0.0.0.0'
        }
    },
    lastUpdated: true,
    themeConfig: {
        algolia :{
            appId:'GPX84VDH91',
            apiKey: '150dda0b943087c4e6a04d54af1d7391',
            indexName: 'sugarat',
            placeholder: '请输入要搜索的内容...',
        },
        lastUpdatedText: '上次更新于',
        footer: {
            message: `MIT Licensed | ${Pkg.version}`,
            copyright: 'Copyright © 2019-PRESENT 粥里有勺糖'
        },
        logo: '/logo.png',
        editLink: {
            pattern: "https://github.com/ATQQ/easypicker2-client/edit/main/docs/:path",
            text: '去 GitHub 上编辑内容'
        },
        nav: [
            {
                text: '私有化部署',
                items: [
                    {
                        text: '本地启动',
                        link: '/deploy/local',
                    },
                    {
                        text: '线上部署',
                        link: '/deploy/online',
                    },
                    {
                        text: '接入七牛云OSS',
                        link: '/deploy/qiniu',
                    },
                    {
                        text: '常见问题❓',
                        link: '/deploy/faq',
                    },
                    {
                        text: '相关设计',
                        link: '/deploy/design/index',
                    }
                ],
                activeMatch: '/deploy/'
            },
            {
                text: `v${Pkg.version}`,
                items: [
                    { text: '⭐️ 需求墙', link: '/plan/wish' },
                    { text: '🥔 近期规划', link: '/plan/todo' },
                    { text: '📅 更新日志', link: '/plan/log' },
                ],
                activeMatch: '/plan/'
            },
            {
                text: '作者信息', link: '/author',
            },
            {
                text: '打赏', link: '/praise/index',
            },
            { text: '⭐️ 需求墙', link: '/plan/wish' },
        ],
        sidebar: {
            'deploy': [
                {
                    text: '私有化部署',
                    items: [
                        {
                            text: 'Getting Started',
                            link: '/deploy/',
                        },
                        {
                            text: '本地启动',
                            link: '/deploy/local',
                        },
                        {
                            text: '线上部署 - 使用宝塔面板',
                            link: '/deploy/online',
                        },
                        {
                            text: '接入七牛云OSS服务',
                            link: '/deploy/qiniu',
                        },
                        {
                            text: '常见问题❓',
                            link: '/deploy/faq',
                        }
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
                }
            ],
            'plan': [
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
                        }
                    ],
                },
            ],
            'introduction': [
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
                        }
                    ]
                },
                {
                    text: '功能',
                    items: [
                        {
                            text: '现有功能',
                            link: '/introduction/feature/index',
                        }
                    ]
                }
            ]
        },
        socialLinks: [
            { icon: 'github', link: 'https://github.com/ATQQ/easypicker2-client' },
        ]
    },

})