import { Plugin,  TFile,View } from "obsidian";
import fileSystem from "./utils/fileSystem";
import pluginCommands from "./ui/cpCommands";
import { Settings, DEFAULT_SETTINGS, SettingsTab } from './ui/settings';
import * as transporter from "./utils/transporterFunctions";
import fileCacheAnalyzer from "./utils/fileCacheAnalyzer";

export default class ThePlugin extends Plugin {
	appName = "Obsidian42 - Text Transporter";
	appID = "obsidian42-text-transporter";
	settings: Settings;
	ribbonIcon: HTMLElement;
	fs: fileSystem;
	commands: pluginCommands;

	async onload(): Promise<void> {
		console.log("loading " + this.appName);
		this.fs = new fileSystem(this.app);
		this.commands = new pluginCommands(this)

		await this.loadSettings();

		window.o42 = {};
		window.o42.fileCacheAnalyzer = () => {const f = new fileCacheAnalyzer(this, this.app.workspace.activeLeaf.view.file.path)}
		window.o42.fileCacheAnalyzer();

		
		

		this.addSettingTab(new SettingsTab(this.app, this));

		if (this.settings.enableRibbon)
			this.configureRibbonCommand();

	}

	onunload(): void { console.log("unloading " + this.appName) }

	configureRibbonCommand(): void {
		this.ribbonIcon = this.addRibbonIcon("blocks", this.appName, async () => this.commands.masterControlProgram());
	}

	async loadSettings(): Promise<void> { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) }

	async saveSettings(): Promise<void> { await this.saveData(this.settings) }
}
