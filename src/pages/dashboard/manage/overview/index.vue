<template>
    <div>
        <div class="card-list">
            <div v-for="c in cardList" :key="c.type" class="card">
                <div class="logo">
                    <i :style="{color:c.color}" :class="c.icon"></i>
                </div>
                <div class="content">
                    <div class="title">{{c.title}}</div>
                    <div class="text">{{c.value}}</div>
                    <div class="supplement">{{c.supplement}}</div>
                </div>
            </div>
        </div>
    </div>
</template>
<script lang="ts">
import { defineComponent, reactive } from 'vue'

export default defineComponent({
  setup() {
    const cardList = reactive([
      {
        type: 'user',
        title: '用户数量',
        value: '102,400',
        supplement: '较昨日 +10',
        icon: 'el-icon-user',
        color: '#40c9c6',
      },
      {
        type: 'file',
        title: '文件数量',
        value: '102,400',
        supplement: '较昨日 +10',
        icon: 'el-icon-document',
        color: '#36a3f7',
      },
      {
        type: 'log',
        title: '日志数量',
        value: '102,400',
        supplement: '较昨日 +10',
        icon: 'el-icon-tickets',
        color: '#f4516c',
      },
    ])
    return {
      cardList,
    }
  },
})
</script>

<style scoped lang="scss">
.card-list {
    display: flex;
    margin-top: 20px;
}
.card {
    margin: 10px;
    height: 108px;
    cursor: pointer;
    font-size: 12px;
    position: relative;
    overflow: hidden;
    color: #666;
    background: #fff;
    box-shadow: 4px 4px 40px rgb(0 0 0 / 5%);
    border-color: rgba(0, 0, 0, 0.05);
    width: 300px;
    .logo {
        float: left;
        margin: 16px 10px 0 10px;
        -webkit-transition: all 0.38s ease-out;
        transition: all 0.38s ease-out;
        border-radius: 6px;
        font-size: 48px;
        i {
            padding: 10px;
        }
    }
    .content {
        float: right;
        font-weight: 700;
        margin: 26px;
        margin-left: 0;
        .title {
            line-height: 18px;
            color: rgba(0, 0, 0, 0.45);
            font-size: 16px;
        }
        .text {
            font-size: 20px;
        }
        .supplement{
            font-size: 12px;
            font-weight: lighter;
        }
    }
}
</style>
