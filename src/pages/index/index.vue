<template>
  <div>
    <img alt="Vue logo" src="../../assets/logo.png" />
    <p class="links">
      <router-link to="/home">Home</router-link>
      <router-link to="/about">About</router-link>
      <router-link :to="`/dynamic/${id}`">Dynamic</router-link>
      <router-link :to="`/axios`">Axios</router-link>
      <router-link :to="`/element`">Element UI Plus</router-link>
    </p>
    <router-view v-slot="{ Component }">
      <transition name="slide-fade">
        <component :is="Component" />
      </transition>
    </router-view>
    <h2>Vuex</h2>
    <h3>{{ isEven ? 'Even' : 'Odd' }}</h3>
    <div>
      <button @click="add">Sync Add</button>
      <button @click="asyncAdd">Async Add</button>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
  setup: () => {
    const store = useStore()

    // eslint-disable-next-line no-bitwise
    const id = computed(() => ~~(Math.random() * 1000))
    return {
      id,
      isEven: computed(() => store.getters['m1/isEven']),
      add: () => store.commit('m1/increase'),
      asyncAdd: () => store.dispatch('m1/increase'),
    }
  },
})
</script>
<style>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.8s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
