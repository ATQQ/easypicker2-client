<template>
    <div class="callme">
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
    </div>
</template>
<script lang="ts" setup>

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

.qq-wechat ul {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 10px;
    align-items: center;
    justify-content: center;
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
    font-size: 15px;
    margin-bottom: 10px;
    text-align: center;
}
</style>
