import { Plugin, } from "obsidian";
import fileSystem from "./utils/fileSystem";
import pluginCommands from "./ui/cpCommands";
import { Settings, DEFAULT_SETTINGS, SettingsTab } from './ui/settings';
import { addIcons } from './ui/icons';

export default class ThePlugin extends Plugin {
	appName = "Obsidian42 - Text Transporter";
	appID = "obsidian42-text-transporter";
	settings: Settings;
	ribbonIcon: HTMLElement;
	fs: fileSystem;
	commands: pluginCommands;

	async onload(): Promise<void> {
		console.log("loading " + this.appName);
		this.fs = new fileSystem(this);
		await this.loadSettings();
		this.commands = new pluginCommands(this)
		addIcons();
		if (this.settings.enableRibbon) this.configureRibbonCommand();
		this.addSettingTab(new SettingsTab(this.app, this));
	}

	onunload(): void { console.log("unloading " + this.appName) }

	configureRibbonCommand(): void {
		this.ribbonIcon = this.addRibbonIcon("TextTransporter", this.appName, async () => this.commands.masterControlProgram());
	}

	async loadSettings(): Promise<void> { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) }

	async saveSettings(): Promise<void> { await this.saveData(this.settings) }
}
