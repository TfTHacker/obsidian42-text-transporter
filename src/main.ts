import { Plugin } from "obsidian";
import { genericFuzzySuggester, suggesterItem } from "./ui/genericFuzzySuggester";
import fileSystem from "./utils/fileSystem";

export default class ThePlugin extends Plugin {
    appName: string = "Obsidian42 - WarpDrive";
    fs: fileSystem;

	async onload() {
		console.log("loading " + this.appName);
        this.fs = new fileSystem(this.app);

		this.addCommand({
			id: 'open-warp-drive-test',
			name: 'teest',
			callback: async ()=> {
				let x = new genericFuzzySuggester(this);
				x.setSuggesterData( await this.fs.getAllFoldersAndFiles('/') );
				const result = x.display( (i: suggesterItem, evt: MouseEvent | KeyboardEvent  )=>{
					console.log('callback')
					console.log(i)
					console.log(evt)
				});		
			}
		});

	}

	onunload() {
		console.log("unloading " + this.appName);
	}

}
