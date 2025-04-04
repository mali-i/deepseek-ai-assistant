import { Plugin } from "obsidian";
import { SampleSettingTab } from "./setting-tab";

export default class SamplePlugin extends Plugin {
    onload() {
        this.addSettingTab(new SampleSettingTab(this.app, this));
    }
    onunload() {
    }
}
