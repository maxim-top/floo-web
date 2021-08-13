<template>
  <div :key="appStyle" :style="appStyle" id="app">
    <Index />
  </div>
</template>

<script>
import Index from './ui/index.vue';

export default {
  name: 'app',
  data() {
    return {
      windowWidth: 0,
      windowHeight: 0,
      appStyle: ''
    };
  },
  mounted() {
    this.windowHeight = window.innerHeight;
    this.windowWidth = window.innerWidth;
    this.appStyle = this.responsive();
  },

  created() {
    window.addEventListener('resize', this.onResize);
  },

  destroyed() {
    window.removeEventListener('resize', this.onResize);
  },

  methods: {
    responsive() {
      const left = this.windowWidth < 760 ? '0%' : '50%';
      const top = this.windowHeight < 400 ? '0%' : '50%';
      return 'left: ' + left + ';top: ' + top + '; transform: translate(-' + left + ', -' + top + ');';
    },

    onResize() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
      this.appStyle = this.responsive();
    }
  },
  components: {
    Index
  }
};
</script>

<style></style>
