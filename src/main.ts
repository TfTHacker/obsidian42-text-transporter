import { Plugin } from "obsidian";
import { genericFuzzySuggester, suggesterItem } from "./ui/genericFuzzySuggester";
import fileSystem from "./utils/fileSystem";
import pluginCommands from "./ui/cpCommands"

export default class ThePlugin extends Plugin {
	appName: string = "Obsidian42 - WarpDrive";
	appID: string = "obsidian-warp-drive";
	fs: fileSystem;
	commands: pluginCommands;

	async onload() {
		console.log("loading " + this.appName);
		this.fs = new fileSystem(this.app);
		this.commands = new pluginCommands(this)
	};

	onunload() {
		console.log("unloading " + this.appName);
	};

}
