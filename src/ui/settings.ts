import { App, PluginSettingTab, Setting, ToggleComponent } from 'obsidian';
import ThePlugin from '../main';

export interface Settings {
	enableRibbon: boolean,
	enableDNP: boolean,
	enableDebugMode: boolean,
	blockRefAliasIndicator: string,
	enableContextMenuCommands: boolean,
	bookmarks: string
}

export const DEFAULT_SETTINGS: Settings = {
	enableRibbon: true,
	enableDNP: true,
	enableDebugMode: false,
	blockRefAliasIndicator: "*",
	enableContextMenuCommands: true,
	bookmarks: ""
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
			.setName('Enable Context Menu')
			.setDesc('Toggle on and off the text transporter commands from appearing in the context menu.')
			.addToggle((cb: ToggleComponent) => {
				cb.setValue(this.plugin.settings.enableContextMenuCommands);
				cb.onChange(async (value: boolean) => {
					this.plugin.settings.enableContextMenuCommands = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Daily Notes Page Support')
			.setDesc('Toggle on and off support for quickly interacting with your DNP with various commands.')
			.addToggle((cb: ToggleComponent) => {
				cb.setValue(this.plugin.settings.enableDNP);
				cb.onChange(async (value: boolean) => {
					this.plugin.settings.enableDNP = value;
					await this.plugin.saveSettings();
				});
			});


		new Setting(containerEl)
			.setName("Alias Indicator")
			.setDesc("Indicator used for an aliased block reference.")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.blockRefAliasIndicator)
					.onChange(async (value) => {
						if (value.trim() === "")
							this.plugin.settings.blockRefAliasIndicator = "*"; //empty value, default to *
						else
							this.plugin.settings.blockRefAliasIndicator = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Bookmarks')
			.setDesc(`Predefined destinations that appear at the top of the file selector. 
						Each line represents one bookmark. The line starts with the path to the file (ex: directory1/subdirectory/filename.md) 
						If just the file path is provided, the file contents will be shown for insertion.
						If after the file name there is a semicolon followed by either: TOP BOTTOM or text to find in the document as an insertion point. Example:\n
						directory1/subdirectory/filename1.md;TOP  directory1/subdirectory/filename2.md;BOTTOM  directory1/subdirectory/filename3.md;# Inbox
						`)
			.addTextArea((text) => {
				text
					.setPlaceholder(" directory1/subdirectory/filename1.md;\n directory1/subdirectory/filename2.md;TOP\n directory1/subdirectory/filename3.md;BOTTOM\n directory1/subdirectory/filename4.md;# Inbox")
					.setValue(this.plugin.settings.bookmarks || '')
					.onChange((value) => {
						this.plugin.settings.bookmarks = value;
						this.plugin.saveData(this.plugin.settings);
					})
				text.inputEl.rows = 10;
				text.inputEl.cols = 60;
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
