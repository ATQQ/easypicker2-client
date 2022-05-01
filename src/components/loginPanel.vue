<template>
    <div class="lay-form">
        <!-- 登录面板 -->
        <div class="pannel">
            <div class="logo">
                <router-link to="/">
                    <img src="https://img.cdn.sugarat.top/easypicker/EasyPicker.png" />
                </router-link>
                <p class="name">{{ title }}</p>
                <p class="introduce">{{ introduce }}</p>
            </div>
            <slot></slot>
        </div>
    </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'loginPanel',
  props: {
    title: {
      type: String,
      default: '轻取',
    },
    introduce: {
      type: String,
      default: '在线文件收取助手',
    },
  },
  setup() {
    return {
    }
  },
})
</script>

<style scoped lang="scss">
// 背景之外的部分
.lay-form {
    padding-top: 86px;
    margin: auto;
}

.pannel {
    border-radius: 5px;
    border: 1px solid #e9e9e9;
    width: 430px;
    background-color: #fff;
    opacity: 0.9;
    padding: 40px 8px 48px;
    margin: auto;
    .logo {
        display: flex;
        flex-wrap: wrap;
        flex-direction: column;
        a{
            margin: 1rem auto;
            width: 90%;
            img {
                width: 100%;
                display: block;
                margin: 0 auto;
            }
        }
        p {
            margin: 5px;
            text-align: center;
        }
        p.name {
            font-size: 2rem;
            font-weight: bold;
        }
        p.introduce {
            color: #595959;
            font-size: 1rem;
        }
    }
}

@media screen and (max-width: 700px) {
    .pannel {
        width: 90%;
        background-color: rgba(255, 255, 255, 0.65);
    }
    .logo {
        img {
            width: 60%;
        }
    }
}
</style>
