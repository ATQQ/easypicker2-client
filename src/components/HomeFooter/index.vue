<template>
  <div class="footer">
    <ul>
      <li v-for="(item, index) in navs" :key="index">
        <a target="_blank" rel="noopener" v-bind:href="item.link">{{ item.title }}</a>
      </li>
      <li>
        <a href="https://docs.ep.sugarat.top/author.html" target="_blank">联系作者</a>
      </li>
      <li style="width:26px;">
        <a><Praise>👍🏻</Praise></a>
      </li>
    </ul>
    <ul v-if="navs2.length">
      <li v-for="(item, index) in navs2" :key="index">
        <a target="_blank" rel="noopener" v-bind:href="item.link">{{ item.title }}</a>
      </li>
    </ul>
    <p>v{{version}}
      © 2019 - {{ cunnrentYear }} by
      <a style="color: aliceblue;" target="_blank" rel="noopener" href="https://sugarat.top">粥里有勺糖</a>
    </p>
  </div>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'
import { version } from '../../../package.json'
import Praise from '../Praise/index.vue'

const navs = reactive([
  {
    title: '应用介绍',
    link: 'https://docs.ep.sugarat.top/',
  },
  {
    title: '问卷反馈',
    link: 'https://www.wenjuan.com/s/UZBZJvA040/',
  },
])

const navs2 = reactive([

])

const cunnrentYear = new Date().getFullYear()
</script>

<style lang="scss" scoped>
.footer {
  ul {
    margin: 10px auto;
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
    margin-top: 40px;
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
