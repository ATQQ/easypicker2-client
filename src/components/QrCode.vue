<template>
  <el-image style="width: 150px; height: 150px" :src="src" :preview-src-list="srcList"/>
</template>
<script>
export default {
  name: 'QrCode',
  props: {
    value: String,
  },
  data() {
    return {
      src: '',
      srcList: [],
    }
  },
  watch: {
    value(to) {
      if (!to) {
        return
      }
      this.src = this.createEwm(to)
      this.srcList = [this.src]
    },
  },
  methods: {
    createEwm(text, config) {
      // eslint-disable-next-line no-undef
      const canvasImg = new AraleQRCode({
        text,
        size: 400,
        foreground: '#000',
        ...config,
      })
      return canvasImg.toDataURL('image/png')
    },
  },
  mounted() {
    if (this.value) {
      this.src = this.createEwm(this.value)
      this.srcList = [this.src]
    }
  },
}
</script>
