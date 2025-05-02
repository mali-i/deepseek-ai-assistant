<template>
    <div>
        <h2>AI助手 设置:{{ plugin.settings.API_URL }}</h2>
        <span>AI_KEY</span>
        <input v-model="plugin.settings.API_KEY" placeholder="请输入你的AI KEY"/><br/>
        <span>AI_URL</span>
        <input v-model="plugin.settings.API_URL" placeholder="请输入你的AI URL"/>
        <button @click="plugin.saveSettings">保存</button>
    </div>
</template>

<script setup lang="ts">

const props = defineProps<{
    plugin: any
}>();

</script>

<style scoped>
.sample-class {
    margin-left: 1em;
    color: #6C31E3;
}
</style>