<template>
  <div class="footer">
    <ul>
      <li v-for="(item, index) in navs" :key="index">
        <a target="_blank" rel="noopener" v-bind:href="item.link">{{ item.title }}</a>
      </li>
      <li>
        <router-link to="/author">联系作者</router-link>
      </li>
      <!-- TODO: 补全 -->
      <!-- <li>
              <router-link to="/feedback">反馈</router-link>
      </li>-->
    </ul>
    <p>v{{version}}
      © 2019 - {{ cunnrentYear }} by
      <a target="_blank" rel="noopener" href="https://sugarat.top">粥里有勺糖</a>
    </p>
  </div>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'
import { version } from '../../../package.json'

const navs = reactive([
  // {
  //   title: '使用手册',
  //   // TODO: ddl 2021-04-30 补全链接
  //   link: 'https://sugarat.top/',
  // },
  {
    title: 'GitHub',
    link: 'https://github.com/ATQQ/easypicker2-client',
  },
  // {
  //   title: '联系QQ',
  //   link: 'http://wpa.qq.com/msgrd?v=3&uin=2604395430&site=qq&menu=yes',
  // },
  {
    title: '博客',
    link: 'https://sugarat.top/',
  },
  {
    title: '反馈',
    link: 'https://www.wenjuan.com/s/UZBZJvA040/',
  },
])

const cunnrentYear = new Date().getFullYear()
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
