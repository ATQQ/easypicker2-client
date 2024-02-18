<template>
  <div class="avatar">
    <img class="logo" loading="lazy" src="https://sugarat.top/icon.png" />
    <div class="name">
      <a href="https://sugarat.top" target="_blank">粥里有勺糖</a>
    </div>
    <div class="description">
      前端切图仔
      <br />热爱开源，乐于分享
    </div>
    <div class="links">
      <a
        class="github-icon"
        href="https://github.com/ATQQ"
        target="_blank"
        rel="noopener noreferrer"
      />
    </div>
  </div>
</template>
<style scoped>
.avatar {
  margin-top: 20px;
  text-align: center;
}

.logo {
  width: 100px;
  border-radius: 50%;
  margin: 0 auto;
}

.name {
  font-size: 18px;
  font-weight: bold;
  margin-top: 10px;
  text-align: center;
}

.name a {
  text-decoration: none;
}

.description {
  margin-top: 10px;
  text-align: center;
  line-height: 26px;
  opacity: 0.6;
}

.github-icon {
  background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1.2em' height='1.2em' preserveAspectRatio='xMidYMid meet' viewBox='0 0 32 32'%3E%3Cpath fill='currentColor' fill-rule='evenodd' d='M16 2a14 14 0 0 0-4.43 27.28c.7.13 1-.3 1-.67v-2.38c-3.89.84-4.71-1.88-4.71-1.88a3.71 3.71 0 0 0-1.62-2.05c-1.27-.86.1-.85.1-.85a2.94 2.94 0 0 1 2.14 1.45a3 3 0 0 0 4.08 1.16a2.93 2.93 0 0 1 .88-1.87c-3.1-.36-6.37-1.56-6.37-6.92a5.4 5.4 0 0 1 1.44-3.76a5 5 0 0 1 .14-3.7s1.17-.38 3.85 1.43a13.3 13.3 0 0 1 7 0c2.67-1.81 3.84-1.43 3.84-1.43a5 5 0 0 1 .14 3.7a5.4 5.4 0 0 1 1.44 3.76c0 5.38-3.27 6.56-6.39 6.91a3.33 3.33 0 0 1 .95 2.59v3.84c0 .46.25.81 1 .67A14 14 0 0 0 16 2Z'/%3E%3C/svg%3E");
  width: 30px;
  height: 30px;
  background-repeat: no-repeat;
  background-size: 100%;
}

.links {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.links a {
  display: block;
  opacity: 0.5;
}
</style>
