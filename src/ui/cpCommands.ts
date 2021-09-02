import ThePlugin from "../main";
import { genericFuzzySuggester, suggesterItem } from "./genericFuzzySuggester";
import * as transporter from "../utils/transporterFunctions"
import { Notice } from "obsidian";

interface commandDefinition {
    name: string;
    callback: any;
    id?: string;
}

export default class pluginCommands {
    plugin: ThePlugin;
    commands: Array<suggesterItem> = [
        // { display: " ()", info: async (e: Event) => {} },
        { display: "Select current line (SL)", info: async (e: Event) => transporter.selectCurrentLine()  },
        { display: "Select current line and expand up into previous block (SP)", info: async (e: Event) => transporter.selectCurrentSection(true)  },
        { display: "Select current line and expand down into next block (SN)", info: async (e: Event) => transporter.selectCurrentSection(false)  },
        { display: "Copy current block to clipboard as a block reference (CC)", info: async (e: Event) => transporter.copyBlockRefToClipboard()  },
        { display: "Copy line/selection to another file (CLS)", info: async (e: Event) => transporter.copyOrMoveLineOrSelectionToNewLocation(this.plugin, true) },
        { display: "Move line/selection to another file (MLS)", info: async (e: Event) => transporter.copyOrMoveLineOrSelectionToNewLocation(this.plugin, false) },
        { display: "reload plugin (RP)", info: async (e: Event) => {
            new Notice('Reloading plugin : Text Transporter');
            await app.plugins.disablePlugin('obsidian42-text-transporter');
            await app.plugins.enablePlugin('obsidian42-text-transporter')
        }},
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