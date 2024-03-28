<template>
  <div class="home">
    <ul class="card-grid">
      <li>
        <h2 class="h2">微信赞赏</h2>
        <Picture
          style="width: 200px"
          src="https://img.cdn.sugarat.top/mdImg/MTY0Nzc2MDE3MzM1NA==647760173354"
        />

        <div class="description">
          如果你觉得项目不错
          <br />
          <span>
            可以
            <a href="/praise/index" style="color: #3f9eff"
              >请作者喝 <strong>🍵</strong></a
            >
          </span>
        </div>
      </li>
      <li>
        <h2 class="h2">Developer</h2>
        <div class="user-list">
          <Avatar />
        </div>
      </li>
      <li>
        <h2 class="h2">
          <a href="https://support.qq.com/product/444158" target="_blank"
            >反馈交流</a
          >群
        </h2>

        <Picture
          style="width: 200px; margin: 10px"
          src="https://img.cdn.sugarat.top/mdImg/MTY0Nzc1MjI3MzUwMw==647752273503"
        />
      </li>
    </ul>
  </div>
</template>
<script setup>
import Avatar from './Avatar.vue'
import Picture from './Picture.vue'
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
  text-align: center;
  font-size: 16px;
}

a {
  text-decoration: none;
}

.description {
  margin-top: 10px;
  text-align: center;
  line-height: 26px;
}

.action-link + .action-link {
  margin-left: 20px;
}

.version {
  margin: 0rem 0 2.5rem 0;
  opacity: 0.5;
  display: flex;
  align-items: center;
}

.card-grid {
  list-style: none;
  display: flex;
  max-width: 1168px;
  width: 100%;
  justify-content: space-around;
  flex-wrap: wrap;
}
</style>
