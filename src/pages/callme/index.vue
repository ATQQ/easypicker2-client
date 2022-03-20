<template>
    <div class="callme">
        <main>
            <div class="panel">
                <h1>联系作者</h1>
                <!-- 基本信息 -->
                <div class="baseinfo">
                    <span v-for="(info, idx) in baseInfo" :key="idx" class="info-item">
                        <el-icon>
                            <component :is="info.icon" />
                        </el-icon>
                        <i :class="info.icon"></i>
                        <a target="_blank" :href="info.href">{{ info.text }}</a>
                    </span>
                </div>
                <hr />
                <!-- 一堆二维码 -->
                <div class="qq-wechat">
                    <ul>
                        <li v-for="(qrcode, idx) in qrCOdes" :key="idx">
                            <div class="title">{{ qrcode.text }}</div>
                            <div class="content">
                                <img :src="qrcode.img" />
                            </div>
                        </li>
                    </ul>
                </div>
                <div class="description">
                    <p>如遇无法解决的账号/使用问题,欢迎小窗联系我</p>
                </div>
                <div class="links">
                    <router-link to="/">回到首页</router-link>
                </div>
            </div>
        </main>
    </div>
</template>
<script lang="ts" setup>
import { UserFilled, Promotion } from '@element-plus/icons-vue'

const baseInfo = [
  {
    icon: UserFilled,
    text: '粥里有勺糖',
    href: 'https://sugarat.top',
  },
  {
    icon: Promotion,
    text: 'engineerzjl@foxmail.com',
    href: 'mailto:engineerzjl@foxmail.com',
  },
]

const qrCOdes = [
  {
    text: '微信',
    img: 'https://img.cdn.sugarat.top/mdImg/MTYxOTE1NTk3MTkyNA==619155971925',
  },
  {
    text: '公众号',
    img: 'https://img.cdn.sugarat.top/mdImg/MTYxOTE1NTYwNzQ5MQ==619155607491',
  },
  {
    text: 'QQ',
    img: 'https://img.cdn.sugarat.top/mdImg/MTYxOTE1NjQ5ODczOQ==619156498739',
  },
  {
    text: '交流群',
    img: 'https://img.cdn.sugarat.top/mdImg/MTY0Nzc2MTE2MTE2NA==ep-group.png',
  },
]

</script>
<style lang="scss" scoped>
h1,
h2,
h3,
h4 {
    font-weight: 500;
}
.callme {
    background-image: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);
    min-height: 100vh;
}
main {
    max-width: 860px;
    margin: 0 auto;
    padding: 20px;
    .panel {
        position: relative;
        margin: 0 auto 20px;
        padding: 16px 20px;
        width: 100%;
        overflow: hidden;
        border-radius: 0.25rem;
        box-shadow: #eee;
        box-sizing: border-box;
        transition: all 0.3s;
        background-color: #fff;
    }
    h1 {
        font-size: 1.6rem;
        font-weight: 500;
        margin-bottom: 10px;
    }
    .baseinfo {
        color: #7f7f7f;
        font-size: 1rem;
        display: flex;
        flex-wrap: wrap;
        a {
            color: #7f7f7f;
            font-size: 1rem;
            margin-left: 10px;
        }
        .info-item {
            margin-right: 20px;
        }
        margin-bottom: 10px;
    }
    hr {
        margin-bottom: 10px;
    }
    .qq-wechat ul {
        list-style: none;
        display: flex;
        flex-wrap: wrap;
        margin-bottom: 10px;
        li {
            text-align: center;
            .title {
                font-weight: 600;
            }
            .content {
                padding: 0.5em;
            }
            img {
                width: 150px;
            }
        }
    }
    .description {
        color: #242424;
        font-size: 15px;
        margin-bottom: 10px;
        text-align: center;
    }
    .links {
        text-align: center;
        a {
            color: #409eff;
        }
    }
}
</style>
