import { App, PluginSettingTab, Setting, ToggleComponent } from 'obsidian';
import ThePlugin from '../main';

export interface Settings {
	enableRibbon: boolean,
    enableDebugMode: boolean
}

export const DEFAULT_SETTINGS: Settings = {
	enableRibbon: true,
    enableDebugMode: false
}

export class SettingsTab extends PluginSettingTab {
	plugin: ThePlugin;

	constructor(app: App, plugin: ThePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: this.plugin.appName });

        new Setting(containerEl)
			.setName('Enable Ribbon Support')
			.setDesc('Toggle on and off the plugin button in the ribbon.')
			.addToggle((cb: ToggleComponent) => {
				cb.setValue(this.plugin.settings.enableRibbon);
				cb.onChange(async (value: boolean) => {
					this.plugin.settings.enableRibbon = value;
					if (this.plugin.settings.enableRibbon === false)
						this.plugin.ribbonIcon.remove();
					else
						this.plugin.configureRibbonCommand();
					await this.plugin.saveSettings();
				});
			});

        new Setting(containerEl)
        .setName('Debugging support')
        .setDesc('Toggle on and off debugging support for troubleshooting problems. This may require restarting Obsidian. Also a blackhole may open in your neigborhood.')
        .addToggle((cb: ToggleComponent) => {
            cb.setValue(this.plugin.settings.enableDebugMode);
            cb.onChange(async (value: boolean) => {
                this.plugin.settings.enableDebugMode = value;
                await this.plugin.saveSettings();
            });
        });

	}
}
