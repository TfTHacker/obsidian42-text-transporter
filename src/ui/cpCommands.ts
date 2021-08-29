import ThePlugin from "../main";
import { genericFuzzySuggester, suggesterItem } from "./genericFuzzySuggester";

interface commandDefinition {
    name: string;
    callback: any;
    id?: string;
}

export default class pluginCommands {
    plugin: ThePlugin;
    commands: Array<suggesterItem> = [
        { display: "test 1 function name", info: async (e: Event) => console.log('test 1', this.plugin, e) },
        { display: "test 2 function name", info: async (e: Event) => console.log('test 2', this.plugin, e) },
    ];

    constructor(plugin: ThePlugin) {
        this.plugin = plugin
        // Combined function
        this.plugin.addCommand({
            id: this.plugin.appID + '-combinedCommands', name: 'All Commands List',
            callback: async () => {
                let gfs = new genericFuzzySuggester(this.plugin);
                gfs.setSuggesterData(this.commands);
                const result = gfs.display(async (i: any, evt: MouseEvent | KeyboardEvent) => i.item.info(evt));
            }
        });

        // individual menu commands
        for (let i = 0; i < this.commands.length; i++)
            this.plugin.addCommand({ id: this.plugin.appID + "-" + i.toString(), name: this.commands[i].display, callback: this.commands[i].info });
    };
}