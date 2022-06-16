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
        ['script', {},'LA.init({id: "JiqK2jS5HmnB4s8G",ck: "JiqK2jS5HmnB4s8G",hashMode:true})'],
    ],
    vite: {
        server: {
            port: 4000,
            host: '0.0.0.0'
        }
    },
    lastUpdated: true,
    themeConfig: {
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
            { text: '私有化部署', link: '/deploy/' },
            {
                text: `v${Pkg.version}`,
                items: [
                    { text: '更新日志', link: '/plan/log' },
                    { text: '近期规划', link: '/plan/todo' },
                ],
                activeMatch:'/plan/'
            },
            { text: '作者博客', link: 'https://sugarat.top' },
            { text: '联系作者', link: "https://ep.sugarat.top/author" }
        ],
        sidebar: {
            'deploy': [{
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
            }],
            'plan': [
                {
                    text: '近期动态',
                    items: [
                        {
                            text: '🥔TODO-LIST',
                            link: '/plan/todo',
                        },
                        {
                            text: '更新日志',
                            link: '/plan/log',
                        }
                    ],
                },
            ]
        },
        socialLinks: [
            { icon: 'github', link: 'https://github.com/ATQQ/easypicker2-client' },
        ]
    },

})