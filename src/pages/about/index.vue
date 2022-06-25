<template>
    <div class="about">
        <main>
            <div class="panel">
                <router-link to="/">
                    <img class="logo" src="https://img.cdn.sugarat.top/easypicker/EasyPicker.png">
                </router-link>
            </div>
            <div class="panel">
                <h1>简介</h1>
                <p>在线文件收取助手,帮助用户快速的完成一对多的文件收取</p>
            </div>
            <div class="panel">
                <h1>诞生背景</h1>
                <p>校园学习或者工作场景中会有以下几个场景:</p>
                <ul>
                    <li><strong>电子文件:</strong> 班委向同学收取各种实验电子报告</li>
                    <li><strong>图片:</strong> 收取各种截图证明/活动照片</li>
                    <li>...</li>
                </ul>
                <p>目前最广泛的收取方式为,通过邮箱,QQ,微信等通讯工具传递</p>
                <p>弊端显而易见,不方便整理统计。还占用电脑/手机内存</p>
                <p>为了解决这个问题,此项目应运而生</p>
                <p>当然<span><strong>市面上也有几款类似的办公工具</strong></span> ,功能及使用方式都差不多</p>
                <p>本项目<strong>是 <a href="https://github.com/ATQQ/easypicker2-client">开源</a> 的</strong> </p>
                <p>如有私有化的需求,可自行部署使用(也可 <router-link to="/author">联系作者</router-link> 提供帮助)</p>
            </div>
            <div class="panel">
                <h1>现有功能 <span style="color:grey;font-size:0.8rem;">(用户关心的)</span></h1>
                <h2>收集任务</h2>
                <ul>
                    <li><strong>分类管理: </strong> 收集任务支持分类管理</li>
                    <li><strong>设置DDL(截止日期): </strong> 任务截止后不可再提交文件</li>
                    <li><strong>限制提交人员: </strong> 非指定的人员(姓名),无法提交文件</li>
                    <li><strong>设置模板文件: </strong> 提交者可直接在提交页面下载此文件</li>
                    <li><strong>自动重命名: </strong> 提交的文件按填写表单信息进行自动重名(如:姓名-工号.后缀)</li>
                </ul>
                <h2>文件相关</h2>
                <ul>
                    <li><strong>上传(提交): </strong>单个/多个</li>
                    <li><strong>下载: </strong>单个/多个/按收集任务</li>
                    <li><strong>撤回: </strong>用户可以撤回自己提交的文件</li>
                    <li><strong>分享: </strong>用户可以将文件下载链接分享给朋友</li>
                    <li><strong>模板下载: </strong> 下载任务发布者设置的模板文件</li>
                    <li><strong>导出: </strong> 导出提交记录</li>
                </ul>
            </div>
            <div class="panel">
                <h1>相关链接</h1>
                <h2>应用链接相关</h2>
                <ul>
                    <li><a href="https://docs.ep.sugarat.top" target="_blank" rel="noopener noreferrer">私有化部署</a></li>
                    <li><a target="_blank" href="https://ep.sugarat.top">Easypicker1.0</a></li>
                    <li><a target="_blank" href="https://ep2.sugarat.top">Easypicker2.0</a></li>
                </ul>
                <h2>应用源代码 <span style="color:grey;font-size:0.8rem;">(开发者需要的)</span></h2>
                <ul>
                    <li><a target="_blank" href="https://github.com/ATQQ/EasyPicker-webpack">Easypicker1.0-客户端</a></li>
                    <li><a target="_blank" href="https://github.com/ATQQ/easypicker-server">Easypicker1.0-服务端</a></li>
                </ul>
                <ul>
                    <li><a target="_blank" href="https://github.com/ATQQ/easypicker2-client">Easypicker2.0-客户端</a></li>
                    <li><a target="_blank" href="https://github.com/ATQQ/easypicker2-server">Easypicker2.0-服务端</a></li>
                </ul>
                <ul>
                    <li><a target="_blank" href="https://github.com/ATQQ/vite-vue3-template">Easypicker2.0-客户端模板仓库</a></li>
                    <li><a target="_blank" href="https://github.com/ATQQ/node-server">Easypicker2.0-服务端模板仓库</a></li>
                </ul>
                <h2>作者 <span style="color:grey;font-size:0.8rem;">(夹带私货)</span></h2>
                <ul>
                    <li><a target="_blank" href="https://sugarat.top">博客</a></li>
                    <li><a target="_blank" href="https://github.com/ATQQ">GitHub</a></li>
                    <li><a target="_blank" href="https://juejin.cn/user/1028798615918983">掘金</a></li>
                </ul>
            </div>
            <!-- <div class="panel">
                <h1>开发计划</h1>
                <h2>...未完待续</h2>
            </div>
            <div class="panel">
                <h1>涉及技术</h1>
                <h2>...未完待续</h2>
            </div> -->
        </main>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  setup() {
    return {

    }
  },
})
</script>
<style lang="scss" scoped>
h1,
h2,
h3,
h4 {
    font-weight: 500;
}
.about {
    background-image: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);
    min-height: 100vh;
}
main {
    max-width: 860px;
    margin: 0 auto;
    padding: 20px;
    .panel {
        position: relative;
        margin: 0 auto 10px;
        padding: 16px 20px;
        width: 100%;
        overflow: hidden;
        border-radius: 0.25rem;
        box-shadow: #eee;
        box-sizing: border-box;
        transition: all 0.3s;
        background-color: #fff;
    }
    .logo{
        width: 100%;
        max-width: 520px;
        margin: 0 auto;
        display: block;
    }
    h1 {
        font-size: 1.6rem;
        margin-bottom: 10px;
    }
    h2{
        font-size: 1.3rem;
        margin-bottom: 12px;
    }
    ul,ol{
        margin-left: 20px;
        font-size: 15px;
        margin-bottom: 1em;
    }
    p{
        font-size: 15px;
        margin-bottom: 1em;
    }
    a{
        color: #409eff;
    }
}
</style>
