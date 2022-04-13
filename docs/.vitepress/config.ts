import { defineConfig } from 'vitepress'

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
    ],
    vite: {
        server: {
            port: 4000,
            host: '0.0.0.0'
        }
    },
    themeConfig: {
        repo: 'atqq/easypicker2-client',
        logo: '/logo.png',
        docsDir: 'docs',
        docsBranch: 'main',
        editLinks: true,
        editLinkText: '编辑文档',
        lastUpdated: '最后更新时间',
        nav: [
            { text: '私有化部署', link: '/deploy/' },
            // { text: '规划', link: '/plan/' },
            { text: '更新日志', link: '/plan/log' },
            { text: '近期规划', link: '/plan/todo' },
            { text: '博客', link: 'https://sugarat.top' },
            { text: '联系作者', link: "https://ep.sugarat.top/author" }
        ],
        sidebar: {
            'deploy': [{
                text: '私有化部署',
                children: [
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
                        text: '七牛云OSS服务创建',
                        link: '/deploy/qiniu',
                    }
                ],
            }],
            'plan': [
                {
                    text: '规划',
                    children: [
                        {
                            text: '目录',
                            link: '/plan/',
                        },
                        {
                            text: 'TODO-LIST',
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
    },

})