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
        { display: "Copy a block from another file to the current cursor location (CB)", info: async (e: Event) => {} },
        { display: "Copy this block to another file as a block reference (CR)", info: async (e: Event) => {} },    
        { display: "Pull block from another file and delete the original block (PD)", info: async (e: Event) => {} },
        { display: "Pull block from another file and replace it with a block reference (PE)", info: async (e: Event) => {} },
        { display: "Pull block from another file as a block reference (PR)", info: async (e: Event) => {} },
        { display: "Push (move) this block to another file (MD)", info: async (e: Event) => {} },
        { display: "Push (move) this block to another file and replace it with a block reference (ME)", info: async (e: Event) => {} },
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