import { Notice, Plugin } from "obsidian";
import fileSystem from "./utils/fileSystem";
import pluginCommands from "./ui/cpCommands";

import * as transporter from "./utils/transporterFunctions";

export default class ThePlugin extends Plugin {
	appName: string = "Obsidian42 - Text Transporter";
	appID: string = "obsidian42-text-transporter";
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
