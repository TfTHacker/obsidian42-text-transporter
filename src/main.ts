import { Plugin } from "obsidian";
import { genericFuzzySuggester, suggesterItem } from "./ui/genericFuzzySuggester";
import fileSystem from "./utils/fileSystem";

export default class ThePlugin extends Plugin {
    appName: string = "Obsidian42 - WarpDrive";
    fs: fileSystem;

	async onload() {
		console.log("loading " + this.appName);
        this.fs = new fileSystem(this.app);
        this.fs.setExclusionFolders(['b', 'zReadwise',  'f'])

        console.clear(0)
        console.log( await this.fs.getAllFiles('/') )
        console.log( await this.fs.getAllFolders('/') )
        console.log( await this.fs.getAllFoldersAndFiles('/') )

        // let x = new genericFuzzySuggester(this);
        // let data = new Array<suggesterItem>();
        // for (let index = 0; index < 10000; index++) {
        //     data.push( { display: 'hi ' + index, info: 'blah ' + index } );
        // }
        // x.setSuggesterData(data);
        // const result = x.display( (i: suggesterItem, evt: MouseEvent | KeyboardEvent  )=>{
        //     console.log('callback')
        //     console.log(i)
        //     console.log(evt)
        // });
        // console.log(result)

		// this.addCommand({
		// 	id: 'open-JumpToDate-calendar',
		// 	name: 'Date Picker',
		// 	callback: () => {
		// 		setTimeout(	()=>{
		// 			this.datePicker.open(); //need small delay when called from command palette
		// 		}, 250);
		// 	}
		// });


        
        


	}

	onunload() {
		console.log("unloading " + this.appName);
	}

}
