<template>
    <div class="home">
        <a class="version" href="/plan/log">
            <el-icon>
                <CollectionTag />
            </el-icon> {{ pkg.version }}
        </a>
        <div class="actions">
            <a href="/deploy/" class="action-link">
                <el-button type="primary" size="default" :icon="UploadFilled">
                    私有化部署
                </el-button>
            </a>
            <a href="https://ep2.sugarat.top" target="_blank" class="action-link">
                <el-button type="success" size="default" :icon="MostlyCloudy">
                    立即体验
                </el-button>
            </a>
            <a href="https://ep2.sugarat.top/task/627bd3b18a567f1b47bcdace" target="_blank" class="action-link">
                <el-button type="warning" size="default" :icon="MostlyCloudy">
                    提交示例
                </el-button>
            </a>
        </div>
        <div class="features">
            <section class="feature">
                <h2 class="title">快速上手</h2>
                <p class="details">基于Web技术实现，随时随地即可收取，操作简单</p>
            </section>
            <section class="feature">
                <h2 class="title">安全高效</h2>
                <p class="details">使用 <a href="https://www.qiniu.com/products/kodo" target="_blank">七牛云OSS</a> 存储所有文件，无空间限制，无上传下载速度限制</p>
            </section>
            <section class="feature">
                <h2 class="title">开源&免费</h2>
                <p class="details">支持个人私有化部署</p>
            </section>
        </div>
        <h2 class="h2">Developer</h2>
        <div class="user-list">
            <Avatar />
        </div>
        <h2 class="h2">赞赏</h2>
        <div class="description">
            如果你觉得项目不错
            <br />
            <span>
                可以
                <Praise style="color: #3f9eff;">请作者喝 <strong>🍵</strong></Praise>
            </span>
        </div>
        <Picture style="width: 200px;" src="https://img.cdn.sugarat.top/mdImg/MTY0Nzc2MDE3MzM1NA==647760173354" />
        <div>微信赞赏码</div>
        <Picture style="width: 200px;margin: 10px;"
            src="https://img.cdn.sugarat.top/mdImg/MTY0Nzc1MjI3MzUwMw==647752273503" />
        <div>反馈交流群</div>
    </div>
</template>
<script setup>
import { ElButton, ElIcon } from 'element-plus'
import { UploadFilled, MostlyCloudy, CollectionTag } from '@element-plus/icons-vue'
import Picture from './Picture.vue'
import Praise from './Praise.vue'
import pkg from '../../../package.json'
</script>

<style scoped lang="scss">
.home {
    margin: 20px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.h2 {
    opacity: 0.5;
}

.description {
    margin-top: 10px;
    text-align: center;
    line-height: 26px;
}

.action-link+.action-link {
    margin-left: 20px;
}

.features {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    max-width: 392px;
    margin: 0 auto;

    .feature {
        width: 100%;
        padding: 20px 0px;

        h2.title {
            margin: 0;
            font-size: 1.25rem;
            color: var(--c-text);
        }

        .details {
            margin: 0;
            padding-top: 0.25px;
            font-size: 1rem;
            color: var(--c-text-light);
        }
    }
}

@media (min-width: 720px) {
    .features {
        max-width: 960px;

        .feature {
            padding: 20px 24px;
            width: calc(100% / 3);
        }
    }
}

.version {
    margin: 0rem 0 2.5rem 0;
    opacity: 0.5;
    display: flex;
    align-items: center;
}
.actions{
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    a{
        margin:10px
    }
}
</style>
