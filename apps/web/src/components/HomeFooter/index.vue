<script lang="ts" setup>
import { computed } from 'vue'
import { version } from '../../../package.json'

const props = defineProps<{
  type?: 'home' | 'dashboard' | 'task'
}>()

const contactAuthorLink = 'https://docs.ep.sugarat.top/author.html#%E8%81%94%E7%B3%BB%E4%BD%9C%E8%80%85'

const navList = computed(() => {
  const navMap = {
    home: [
      {
        title: '应用介绍',
        link: 'https://docs.ep.sugarat.top/',
      },
      // {
      //   title: 'GitHub',
      //   link: 'https://github.com/ATQQ/easypicker2-client'
      // },
      {
        title: '问题反馈',
        link: contactAuthorLink,
      },
      {
        title: '联系作者',
        link: contactAuthorLink,
      },
      {
        title: '请喝奶茶🧋',
        link: 'https://docs.ep.sugarat.top/praise/index.html',
      },
    ],
    dashboard: [
      {
        title: '页面&功能问题反馈，点这里😊',
        link: contactAuthorLink,
      },
    ],
    task: [
      {
        title: '页面&功能问题反馈，点这里😊',
        link: contactAuthorLink,
      },
    ],
  }

  return navMap[props.type || 'home'] || []
})

const currentYear = new Date().getFullYear()
const fontColor = computed(() => {
  const colors = {
    home: '#fff',
    dashboard: '#7f7f7f',
    task: '#a4a4a4',
  }
  return colors[props.type || 'home']
})

const shadowColor = computed(() => {
  const colors = {
    home: '#ddd',
    dashboard: '#9b9b9b',
    task: '#d5d5d5',
  }
  return colors[props.type || 'home']
})
</script>

<template>
  <div class="footer">
    <ul>
      <li v-for="(item, index) in navList" :key="index">
        <a target="_blank" rel="noopener" :href="item.link">{{
          item.title
        }}</a>
      </li>
    </ul>
    <p>
      <a
        href="https://docs.ep.sugarat.top/plan/log.html"
        target="_blank"
        rel="noopener"
      >v{{ version }}</a>
      © 2019 - {{ currentYear }} by
      <a
        target="_blank"
        rel="noopener"
        href="https://docs.ep.sugarat.top/author.html"
      >粥里有勺糖</a>
    </p>
  </div>
</template>

<style lang="scss" scoped>
.footer {
  ul {
    margin: 10px auto;
    display: flex;
    justify-content: center;
    li {
      min-width: 80px;
      list-style: none;
      text-align: center;
      a {
        text-align: center;
        color: v-bind(fontColor);
        opacity: 0.8;
        font-size: 1rem;
        line-height: 1rem;
        &:hover {
          opacity: 1;
          text-shadow: 0 0 2px v-bind(shadowColor);
        }
      }
    }
  }

  p {
    margin-top: 28px;
    padding-bottom: 20px;
    color: v-bind(shadowColor);
    a {
      color: v-bind(shadowColor);
      margin-left: 10px;
    }
  }
  p {
    text-align: center;
  }
}
</style>
