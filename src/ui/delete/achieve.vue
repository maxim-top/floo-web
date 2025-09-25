<template>
  <div class="login">
    <p class="header">
      <span class="hint">AppID: {{ appid }}</span>
    </p>
    <div class="logo">
      <img src="/image/logob.png" />
    </div>
    <div class="info">
      <h2>账号注销成功</h2>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'delete',
  props: ['appid'],

  data() {
    return {};
  }
};
</script>

<style scoped></style>
