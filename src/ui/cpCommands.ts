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
        { display: "Add block ref ID's to selection (ABI)", info: async (): Promise<void>  => transporter.addBlockRefsToSelection()  },
        { display: "Copy current block to clipboard as a block reference (CC)", info: async (): Promise<void>  => transporter.copyBlockRefToClipboard()  },
        { display: "Copy line/selection to another file (CLT)", info: async (): Promise<void>  => transporter.copyOrPushLineOrSelectionToNewLocation(this.plugin, true) },
        { display: "Copy line(s) from another file (CLF)", info: async (): Promise<void>  => transporter.copyOrPulLineOrSelectionFromAnotherLocation(this.plugin, true) },
        { display: "Push line/selection to another file (PLT)", info: async (): Promise<void>  => transporter.copyOrPushLineOrSelectionToNewLocation(this.plugin, false) },
        { display: "Push line/selection to another file as Block Ref (PLB)", info: async (): Promise<void>  => transporter.pushBlockReferenceToAnotherFile(this.plugin) },
        { display: "Pull line(s) from another file (LLF)", info: async (): Promise<void>  => transporter.copyOrPulLineOrSelectionFromAnotherLocation(this.plugin, false) },
        { display: "Pull line(s) from another file as block (LLB)", info: async (): Promise<void>  => transporter.pullBlockReferenceFromAnotherFile(this.plugin) },
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

        this.plugin.registerEvent(
            this.plugin.app.workspace.on("editor-menu", (menu) => {
                menu.addItem((item) => {
                    item
                    .setTitle("Copy block ref")
                    .setIcon("links-coming-in")
                    .onClick(() => { transporter.copyBlockRefToClipboard() });
                });
                menu.addItem((item) => {
                    item
                    .setTitle("Add block Reference ID's to selection")
                    .setIcon("links-coming-in")
                    .onClick(() => { transporter.addBlockRefsToSelection() });
                });
                menu.addItem((item) => {
                    item
                    .setTitle("Copy line/selection to another file")
                    .setIcon("links-coming-in")
                    .onClick(() => { transporter.copyOrPushLineOrSelectionToNewLocation(this.plugin, true) });
                });
                menu.addItem((item) => {
                    item
                    .setTitle("Push line/selection to another file")
                    .setIcon("links-coming-in")
                    .onClick(() => { transporter.copyOrPushLineOrSelectionToNewLocation(this.plugin, false) });
                });                
            })
        );

        // individual menu commands
        for (let i = 0; i < this.commands.length; i++)
            this.plugin.addCommand({ id: this.plugin.appID + "-" + i.toString(), name: this.commands[i].display, callback: this.commands[i].info });
    }
}