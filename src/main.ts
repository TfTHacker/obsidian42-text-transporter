import { Plugin } from "obsidian";
import { genericFuzzySuggester, suggesterItem } from "./ui/genericeFuzzySuggester";

export default class ThePlugin extends Plugin {
    appName: string = "Obsidian42 - WarpDrive";

	async onload() {
		console.log("loading " + this.appName);

        let x = new genericFuzzySuggester(this);
        let data = new Array<suggesterItem>();
        for (let index = 0; index < 10000; index++) {
            data.push( { display: 'hi ' + index, info: 'blah ' + index } );
        }
        x.setSuggesterData(data);
        const result = x.display( (i: suggesterItem, evt: MouseEvent | KeyboardEvent  )=>{
            console.log('callback')
            console.log(i)
            console.log(evt)
        });
        console.log(result)

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
