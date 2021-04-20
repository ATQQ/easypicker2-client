<template>
    <div class="footer">
        <ul>
            <li v-for="(item, index) in navs" :key="index">
                <a target="_blank" v-bind:href="item.link">{{ item.title }}</a>
            </li>
            <li>
              <router-link to="/feedback">反馈</router-link>
            </li>
        </ul>
        <p>
            © 2019 - {{ cunnrentYear }} by
            <a target="_blank" href="https://github.com/ATQQ">sugar</a>
        </p>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'HomeFooter',
  setup() {
    const navs = [
      {
        title: '使用手册',
        // TODO: ddl 2021-04-30 补全链接
        link: 'https://sugarat.top/',
      },
      {
        title: 'GitHub',
        link: 'https://github.com/ATQQ/easypicker2-client',
      },
      {
        title: '联系QQ',
        link: 'http://wpa.qq.com/msgrd?v=3&uin=2604395430&site=qq&menu=yes',
      },
      {
        title: '博客',
        link: 'https://sugarat.top/',
      },
    ]

    const cunnrentYear = new Date().getFullYear()
    return {
      navs,
      cunnrentYear,
    }
  },
})
</script>

<style lang="scss" scoped>
.footer {
    ul {
        margin: 0 auto;
        display: flex;
        justify-content: center;
        li {
            width: 80px;
            list-style: none;
            text-align: center;
            a {
                text-align: center;
                color: #fff;
                opacity: 0.8;
                font-size: 1rem;
                line-height: 1rem;
                &:hover {
                    opacity: 1;
                    text-shadow: 0 0 2px #ddd;
                }
            }
        }
    }

    p {
        margin-top: 20px;
        padding-bottom: 20px;
        color: #ddd;
        a {
            color: #ddd;
            margin-left: 10px;
        }
    }
    p {
        text-align: center;
    }
}
</style>
