import { App, PluginSettingTab, Setting, Modal, Notice } from "obsidian";
import Plugin_Deepseek_AI_Assistant from "./main";
import { ModelConfig, DEFAULT_SETTINGS } from "./settings";

export class DeepSeekAIAssistant_SettingTab extends PluginSettingTab {
    plugin: Plugin_Deepseek_AI_Assistant;
    constructor(app: App, plugin: Plugin_Deepseek_AI_Assistant) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        
        containerEl.createEl('h1', { text: 'AI Assistant Models' });
        containerEl.createEl('p', { text: 'Configure different AI models with their specific settings.', cls: 'setting-item-description' });

        const models = this.plugin.settings.models || [];

        // Check migration (simple check)
        if (!this.plugin.settings.models && (this.plugin.settings as any).customModels) {
             // Basic migration logic could go here, but for now we rely on user adding new ones or using defaults
        }

        // --- Models List ---
        models.forEach((model, index) => {
            const setting = new Setting(containerEl)
                .setName(model.name)
                .setDesc(`${model.modelId} · ${model.apiUrl}`)
                .addButton(button => button
                    .setIcon('pencil')
                    .setTooltip('Edit Model')
                    .onClick(() => {
                        new ModelEditModal(this.plugin.app, model, async (updatedModel) => {
                            this.plugin.settings.models[index] = updatedModel;
                            await this.plugin.saveSettings();
                            this.display();
                        }).open();
                    }))
                .addButton(button => button
                    .setIcon('trash')
                    .setTooltip('Remove Model')
                    .setWarning()
                    .onClick(async () => {
                        if(confirm(`Are you sure you want to delete "${model.name}"?`)){
                            this.plugin.settings.models.splice(index, 1);
                            await this.plugin.saveSettings();
                            this.display(); 
                        }
                    }));
        });

        // --- Add New Model Button ---
        new Setting(containerEl)
            .setName('Add New Model')
            .setDesc('Add a new configuration for an AI model.')
            .addButton(button => button
                .setButtonText('Add Model')
                .setCta()
                .onClick(() => {
                    const newModelTemplate: ModelConfig = {
                        id: crypto.randomUUID(),
                        name: 'New Model',
                        modelId: '',
                        apiKey: '',
                        apiUrl: 'https://api.openai.com/v1' // Common default
                    };
                    new ModelEditModal(this.plugin.app, newModelTemplate, async (newModel) => {
                        if (!this.plugin.settings.models) this.plugin.settings.models = [];
                        this.plugin.settings.models.push(newModel);
                        await this.plugin.saveSettings();
                        this.display();
                    }).open();
                }));

        // --- Reset ---
        containerEl.createEl('h3', { text: 'Reset', cls: 'settings-header-danger' });
        new Setting(containerEl)
        .setName('Reset All Models')
        .setDesc('Restore default DeepSeek configurations. This will delete your custom settings.')
        .addButton(button => button
            .setButtonText('Reset Defaults')
            .onClick(async () => {
                if(confirm('This will wipe all your custom model configurations. Continue?')) {
                    this.plugin.settings.models = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.models));
                    await this.plugin.saveSettings();
                    this.display();
                }
            }));
    }
}

class ModelEditModal extends Modal {
    model: ModelConfig;
    onSubmit: (model: ModelConfig) => void;

    constructor(app: App, model: ModelConfig, onSubmit: (model: ModelConfig) => void) {
        super(app);
        this.model = JSON.parse(JSON.stringify(model)); // Deep clone
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Edit Model Configuration' });

        const formDiv = contentEl.createDiv({ cls: 'model-edit-form' });
        
        // Display Name
        new Setting(formDiv)
            .setName('Display Name')
            .setDesc('Name shown in the chat dropdown.')
            .addText(text => text
                .setValue(this.model.name)
                .onChange(value => { this.model.name = value; }));

        // Model ID
        new Setting(formDiv)
            .setName('Model ID')
            .setDesc('The internal model string used by the API (e.g., deepseek-chat, gpt-4).')
            .addText(text => text
                .setValue(this.model.modelId)
                .onChange(value => { this.model.modelId = value; }));

        // API URL
        new Setting(formDiv)
            .setName('API URL')
            .setDesc('Base URL for the API.')
            .addText(text => text
                .setPlaceholder('https://api.deepseek.com')
                .setValue(this.model.apiUrl)
                .onChange(value => { this.model.apiUrl = value; }));

        // API Key
        new Setting(formDiv)
            .setName('API Key')
            .setDesc('Your secret API Key.')
            .addText(text => {
                text.inputEl.type = 'password';
                text
                .setPlaceholder('sk-...')
                .setValue(this.model.apiKey)
                .onChange(value => { this.model.apiKey = value; })
            });
        
        // Buttons
        const buttonDiv = contentEl.createDiv({ cls: 'model-edit-buttons' });
        buttonDiv.style.marginTop = '20px';
        buttonDiv.style.display = 'flex';
        buttonDiv.style.justifyContent = 'flex-end';
        buttonDiv.style.gap = '10px';

        const saveBtn = buttonDiv.createEl('button', { text: 'Save', cls: 'mod-cta' });
        saveBtn.onclick = () => {
            if(!this.model.name || !this.model.modelId) {
                new Notice('Name and Model ID are required.');
                return;
            }
            this.onSubmit(this.model);
            this.close();
        };

        const cancelBtn = buttonDiv.createEl('button', { text: 'Cancel' });
        cancelBtn.onclick = () => {
            this.close();
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
