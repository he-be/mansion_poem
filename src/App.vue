<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<style scoped>
#app {
  width: 100%;
  min-height: 100vh;
  background-color: #1a1a2e;
}
</style>
