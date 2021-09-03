import ThePlugin from "../main";
import { genericFuzzySuggester, suggesterItem } from "./genericFuzzySuggester";
import * as transporter from "../utils/transporterFunctions"
import { Notice } from "obsidian";

export default class pluginCommands {
    plugin: ThePlugin;
    commands: Array<suggesterItem> = [
        // { display: " ()", info: async (e: Event) Promise<void> => {} },
        { display: "Select current line (SL)", info: async (): Promise<void> => transporter.selectCurrentLine()  },
        { display: "Select current line and expand up into previous block (SP)", info: async (): Promise<void> => transporter.selectCurrentSection(true)  },
        { display: "Select current line and expand down into next block (SN)", info: async (): Promise<void>  => transporter.selectCurrentSection(false)  },
        { display: "Copy current block to clipboard as a block reference (CC)", info: async (): Promise<void>  => transporter.copyBlockRefToClipboard()  },
        { display: "Copy line/selection to another file (CLS)", info: async (): Promise<void>  => transporter.copyOrMoveLineOrSelectionToNewLocation(this.plugin, true) },
        { display: "Move line/selection to another file (MLS)", info: async (): Promise<void>  => transporter.copyOrMoveLineOrSelectionToNewLocation(this.plugin, false) },
        { display: "reload plugin (RP)", info: async (): Promise<void>  => {
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
                const gfs = new genericFuzzySuggester(this.plugin);
                gfs.setSuggesterData(this.commands);
                gfs.display(async (i: any, evt: MouseEvent | KeyboardEvent) => i.item.info(evt)); //call the callback
            }
        });

        // individual menu commands
        for (let i = 0; i < this.commands.length; i++)
            this.plugin.addCommand({ id: this.plugin.appID + "-" + i.toString(), name: this.commands[i].display, callback: this.commands[i].info });
    }
}