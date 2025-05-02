import { defineStore } from 'pinia';
import type MyPlugin from '../main'; // 根据实际路径调整

export const usePluginStore = defineStore('plugin', {
  state: () => ({
    plugin: null as MyPlugin | null,
  }),
  actions: {
    setPlugin(plugin: MyPlugin) {
      console.log(plugin)
      this.plugin = plugin;
    },
  },
});