<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
// 全局配置
useHead({
  htmlAttrs: {
    lang: 'zh-HK'
  }
})
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>

