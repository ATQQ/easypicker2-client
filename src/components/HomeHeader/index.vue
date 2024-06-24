<template>
  <div>
    <nav class="navbar">
      <div class="right-menu">
        <label for="nav-open">
          <span class="menu-icon">
            <el-icon :size="28">
              <Fold />
            </el-icon>
          </span>
        </label>
      </div>
      <input type="checkbox" id="nav-open" />
      <div id="miniMenu">
        <ul class="nav-list">
          <li v-for="({ href, text }, idx) in links" :key="idx">
            <router-link :to="href">{{ text }}</router-link>
          </li>
          <li>
            <a
              href="https://docs.ep.sugarat.top/plan/wish.html"
              target="_blank"
              rel="noopener noreferrer"
              >需求墙</a
            >
          </li>
          <!-- <li>
            <a
              href="https://docs.ep.sugarat.top/introduction/about/index.html"
              target="_blank"
              rel="noopener noreferrer"
              >关于</a
            >
          </li> -->
          <!-- <li>
            <a
              href="https://github.com/ATQQ/easypicker2-client"
              target="_blank"
              rel="noopener noreferrer"
              >GitHub</a
            >
          </li> -->
          <li>
            <a
              href="https://docs.ep.sugarat.top/plan/todo.html"
              target="_blank"
              rel="noopener noreferrer"
              >近期规划</a
            >
          </li>
          <li>
            <a
              href="https://docs.ep.sugarat.top/plan/log.html"
              target="_blank"
              rel="noopener noreferrer"
              >更新日志</a
            >
          </li>
        </ul>
      </div>
    </nav>
  </div>
</template>
<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { Fold } from '@element-plus/icons-vue'
import { useSupportRegister } from '@/composables';
import { computed } from 'vue';

const $route = useRoute()
const supportRegister = useSupportRegister()

const links = computed(()=>{
  const { path } = $route
  return [
    {
      href: '/',
      text: '首页'
    },
    {
      href: '/login',
      text: '登录'
    },
    {
      href: '/register',
      text: '快速注册'
    }
  ]
  .filter(nav => nav.href !== path)
  .filter(nav => supportRegister.value || nav.href !== '/register')
})
</script>
<style lang="scss" scoped>
#nav-open {
  position: absolute;
  z-index: -1;
}
.navbar {
  color: #fff;
  padding: 12px 10px 10px 10px;

  .right-menu {
    margin-right: 15px;
    display: none;
    .menu-icon {
      font-size: 28px;
    }
  }
  .nav-list {
    display: flex;
    justify-content: left;
    li {
      text-align: center;
      list-style: none;
      color: #fff;
      margin: 0 20px;
    }
    a {
      color: #fff;
      opacity: 0.8;
      &:hover {
        opacity: 1;
        text-shadow: 0 0 3px #eee;
      }
    }
  }
}

@media screen and (max-width: 600px) {
  .navbar {
    .right-menu {
      display: block;
      float: right;
      font-size: 20px;
    }
    #nav-open:checked + #miniMenu {
      .nav-list {
        display: flex;
      }
    }
    .nav-list {
      display: none;
      flex-direction: column;
      li {
        margin-top: 6px;
      }
    }
  }
  #miniMenu {
    position: absolute;
    right: 10px;
    top: 40px;
  }
}
</style>
