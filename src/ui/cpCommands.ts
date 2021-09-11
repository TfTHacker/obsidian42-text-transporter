import ThePlugin from "../main";
import { genericFuzzySuggester, suggesterItem } from "./genericFuzzySuggester";
import * as transporter from "../utils/transporterFunctions"
import { Notice, MarkdownView } from "obsidian";
import quickCaptureModal from "./quickCapture";

export default class pluginCommands {
    plugin: ThePlugin;
    commands = [
        {
            caption: "Quick Capture", shortcut: "QC", menu: false, icon: "highlight-glyph",
            command: async (): Promise<void> => (new quickCaptureModal(this.plugin)).open()
        },
        {
            caption: "Select current line", shortcut: "SL", menu: false, icon: "highlight-glyph",
            command: async (): Promise<void> => transporter.selectCurrentLine()
        },
        {
            caption: "Select block - previous", shortcut: "BP", menu: false, icon: "highlight-glyph",
            command: async (): Promise<void> => transporter.selectAdjacentBlock(this.plugin, false)
        },
        {
            caption: "Select block - next", shortcut: "BN", menu: false, icon: "highlight-glyph",
            command: async (): Promise<void> => transporter.selectAdjacentBlock(this.plugin, true)
        },
        {
            caption: "Select current line and expand up into previous block", shortcut: "SP", menu: false, icon: "highlight-glyph",
            command: async (): Promise<void> => transporter.selectCurrentSection(this.plugin, true)
        },
        {
            caption: "Select current line and expand down into next block", shortcut: "SN", menu: false, icon: "highlight-glyph",
            command: async (): Promise<void> => transporter.selectCurrentSection(this.plugin, false)
        },
        {
            caption: "Replace link with text", shortcut: "ABI", menu: false, icon: "blocks",
            command: async (): Promise<void> => {
                const linkInfo = transporter.testIfCursorIsOnALink();
                if (linkInfo) 
                    await transporter.copyBlockReferenceToCurrentCusorLocation(this.plugin, linkInfo, false);
                else
                    new Notice("No link selected in editor.")
            }
        },
        {
            caption: "Replace link with text & alias", shortcut: "ABI", menu: false, icon: "blocks",
            command: async (): Promise<void> => {
                const linkInfo = transporter.testIfCursorIsOnALink();
                if (linkInfo) 
                    await transporter.copyBlockReferenceToCurrentCusorLocation(this.plugin, linkInfo, true);
                else
                    new Notice("No link selected in editor.")
            }
        },
        {
            caption: "Add block ref ID's to selection and Copy them to clipboard", shortcut: "ABI", menu: true, icon: "blocks",
            command: async (): Promise<Array<string>> => transporter.addBlockRefsToSelection(this.plugin, true)
        },
        {
            caption: "Copy embeded block reference for this line", shortcut: "CC", menu: true, icon: "blocks",
            command: async (): Promise<string> => transporter.copyBlockRefToClipboard(this.plugin, true, false)
        },
        {
            caption: "Copy embeded alias block reference", shortcut: "CA", menu: true, icon: "blocks",
            command: async (): Promise<string> => transporter.copyBlockRefToClipboard(this.plugin, true, true, this.plugin.settings.blockRefAliasIndicator)
        },
        {
            caption: "Copy line/selection to another file", shortcut: "CLT", menu: true, icon: "right-arrow-with-tail",
            command: async (): Promise<void> => transporter.copyOrPushLineOrSelectionToNewLocation(this.plugin, true)
        },
        {
            caption: "Push line/selection to another file", shortcut: "PLT", menu: true, icon: "right-arrow-with-tail",
            command: async (): Promise<void> => transporter.copyOrPushLineOrSelectionToNewLocation(this.plugin, false)
        },
        {
            caption: "Push line/selection to another file as Block Ref", shortcut: "PLB", menu: true, icon: "right-arrow-with-tail",
            command: async (): Promise<void> => transporter.pushBlockReferenceToAnotherFile(this.plugin)
        },
        {
            caption: "Copy line(s) from another file", shortcut: "CLF", menu: true, icon: "left-arrow-with-tail",
            command: async (): Promise<void> => transporter.copyOrPulLineOrSelectionFromAnotherLocation(this.plugin, true)
        },
        {
            caption: "Pull line(s) from another file", shortcut: "LLF", menu: true, icon: "left-arrow-with-tail",
            command: async (): Promise<void> => transporter.copyOrPulLineOrSelectionFromAnotherLocation(this.plugin, false)
        },
        {
            caption: "Pull line(s) from another file as block", shortcut: "LLB", menu: true, icon: "left-arrow-with-tail",
            command: async (): Promise<void> => transporter.pullBlockReferenceFromAnotherFile(this.plugin)
        },
    ];

    async reloadPlugin(): Promise<void> {
        new Notice('Reloading plugin: ' + this.plugin.appName);
        // @ts-ignore
        await app.plugins.disablePlugin('obsidian42-text-transporter');
        // @ts-ignore
        await app.plugins.enablePlugin('obsidian42-text-transporter')
    }


    // list of all commands available in Command  Pallet format
    async masterControlProgram(): Promise<void> { // Yes this is a reference to Tron https://www.imdb.com/title/tt0084827/
        const currentView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!currentView || currentView.getMode() !== "source") {
            new Notice("No document in edit mode");
            return;
        }
                const gfs = new genericFuzzySuggester(this.plugin);
        const cpCommands: Array<suggesterItem> = [];
        for (const cmd of this.commands)
            cpCommands.push({ display: cmd.caption, info: cmd.command });
        if (this.plugin.settings.enableDebugMode)
            cpCommands.push({ display: "Reload plugin (Debugging)", info: async (): Promise<void> => this.reloadPlugin() })

        gfs.setSuggesterData(cpCommands);
        gfs.display(async (i: any, evt: MouseEvent | KeyboardEvent) => i.item.info(evt)); //call the callback
    }

    constructor(plugin: ThePlugin) {
        this.plugin = plugin
        // Combined function
        this.plugin.addCommand({
            id: this.plugin.appID + '-combinedCommands', name: 'All Commands List',
            icon: "TextTransporter",
            editorCallback: async () => {
                await this.masterControlProgram();
            }
        });

        this.plugin.registerEvent(
            this.plugin.app.workspace.on("editor-menu", (menu) => {
                const linkInfo = transporter.testIfCursorIsOnALink();
                if (linkInfo) { 
                    menu.addItem(item => {
                        item
                            .setTitle("Replace link with text")
                            .setIcon("lines-of-text")
                            .onClick(async () => await transporter.copyBlockReferenceToCurrentCusorLocation(this.plugin, linkInfo, false));
                    });
                    menu.addItem(item => {
                        item
                            .setTitle("Replace link with text & alias")
                            .setIcon("lines-of-text")
                            .onClick(async () => await transporter.copyBlockReferenceToCurrentCusorLocation(this.plugin, linkInfo, true));
                    });
                }

                if (this.plugin.settings.enableContextMenuCommands)
                    for (const value of this.commands)
                        if (value.menu === true)
                            menu.addItem(item => {
                                item
                                    .setTitle(value.caption)
                                    .setIcon(value.icon)
                                    .onClick(async () => { await value.command() });
                            });
            })
        );

        for (const [key, value] of Object.entries(this.commands)) {
            this.plugin.addCommand({
                id: this.plugin.appID + "-" + key.toString(),
                icon: value.icon,
                name: `${value.caption} (${value.shortcut})`,
                editorCallback: value.command
            });
        }
    }
}

