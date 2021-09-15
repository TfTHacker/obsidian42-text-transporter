import ThePlugin from "../main";
import { genericFuzzySuggester, suggesterItem } from "./genericFuzzySuggester";
import * as transporter from "../utils/transporterFunctions"
import * as selectionTools from "../utils/selectionFunctions";
import { Notice, MarkdownView } from "obsidian";
import quickCaptureModal from "./quickCapture";
import { AddBookmarkFromCurrentView, openBookmark, removeBookmark } from "../utils/bookmarks";

export default class pluginCommands {
    plugin: ThePlugin;
    // commands notes
    // shortcut - MUST be unique, used as part of the Command Palette ID
    // isContextMenuItem - this is a context menu item or not
    // cmItemEnabled - is the context menu item enabled 
    commands = [
        {
            caption: "Quick Capture", shortcut: "QC", editModeOnly: false, isContextMenuItem: false, cmItemEnabled: false, icon: "highlight-glyph",
            command: async (): Promise<void> => (new quickCaptureModal(this.plugin)).open()
        },
        {
            caption: "Select current line/expand to block", shortcut: "SL", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "highlight-glyph",
            command: async (): Promise<void> => selectionTools.selectCurrentLine(this.plugin)
        },
        {
            caption: "Select block - previous", shortcut: "BP", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "highlight-glyph",
            command: async (): Promise<void> => selectionTools.selectAdjacentBlock(this.plugin, false)
        },
        {
            caption: "Select block - next", shortcut: "BN", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "highlight-glyph",
            command: async (): Promise<void> => selectionTools.selectAdjacentBlock(this.plugin, true)
        },
        {
            caption: "Select current line/expand up into previous block", shortcut: "SP", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "highlight-glyph",
            command: async (): Promise<void> => selectionTools.selectCurrentSection(this.plugin, true)
        },
        {
            caption: "Select current line/expand down into next block", shortcut: "SN", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "highlight-glyph",
            command: async (): Promise<void> => selectionTools.selectCurrentSection(this.plugin, false)
        },
        {
            caption: "Replace link with text", shortcut: "RLT", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "blocks",
            command: async (): Promise<void> => {
                const linkInfo = transporter.testIfCursorIsOnALink();
                if (linkInfo)
                    await transporter.copyBlockReferenceToCurrentCusorLocation(this.plugin, linkInfo, false);
                else
                    new Notice("No link selected in editor.")
            }
        },
        {
            caption: "Replace link with text & alias", shortcut: "RLA", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "blocks",
            command: async (): Promise<void> => {
                const linkInfo = transporter.testIfCursorIsOnALink();
                if (linkInfo)
                    await transporter.copyBlockReferenceToCurrentCusorLocation(this.plugin, linkInfo, true);
                else
                    new Notice("No link selected in editor.")
            }
        },
        {
            caption: "Copy block embeds from this selection", shortcut: "CC", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "blocks",
            command: async (): Promise<Array<string>> => transporter.addBlockRefsToSelection(this.plugin, true)
        },
        {
            caption: "Copy block embed as an alias", shortcut: "CA", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "blocks",
            command: async (): Promise<string> => transporter.copyBlockRefToClipboard(this.plugin, true, true, this.plugin.settings.blockRefAliasIndicator)
        },
        {
            caption: "Copy line/selection to another file", shortcut: "CLT", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "right-arrow-with-tail",
            command: async (): Promise<void> => transporter.copyOrPushLineOrSelectionToNewLocationWithFileLineSuggester(this.plugin, true)
        },
        {
            caption: "Push line/selection to another file", shortcut: "PLT", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "right-arrow-with-tail",
            command: async (): Promise<void> => transporter.copyOrPushLineOrSelectionToNewLocationWithFileLineSuggester(this.plugin, false)
        },
        {
            caption: "Push line/selection to another file as a block embed", shortcut: "PLB", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "right-arrow-with-tail",
            command: async (): Promise<void> => transporter.pushBlockReferenceToAnotherFile(this.plugin)
        },
        {
            caption: "Copy line(s) from another file", shortcut: "CLF", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "left-arrow-with-tail",
            command: async (): Promise<void> => transporter.copyOrPulLineOrSelectionFromAnotherLocation(this.plugin, true)
        },
        {
            caption: "Pull line(s) from another file", shortcut: "LLF", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "left-arrow-with-tail",
            command: async (): Promise<void> => transporter.copyOrPulLineOrSelectionFromAnotherLocation(this.plugin, false)
        },
        {
            caption: "Pull Line(s) from another file as block embeds", shortcut: "LLB", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "left-arrow-with-tail",
            command: async (): Promise<void> => transporter.pullBlockReferenceFromAnotherFile(this.plugin)
        },
        {
            caption: "Open a bookmarked file", shortcut: "BO", editModeOnly: false, isContextMenuItem: false, cmItemEnabled: false, icon: "go-to-file",
            command: async (): Promise<void> => await openBookmark(this.plugin)
        },
        {
            caption: "Add a New Bookmark from this file", shortcut: "BA", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "go-to-file",
            command: async (): Promise<void> => AddBookmarkFromCurrentView(this.plugin)
        },
        {
            caption: "Remove a Bookmark", shortcut: "BR", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "go-to-file",
            command: async (): Promise<void> => removeBookmark(this.plugin)
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
        let editMode = true;
        if (!currentView || currentView.getMode() !== "source") editMode = false;

        const gfs = new genericFuzzySuggester(this.plugin);
        const cpCommands: Array<suggesterItem> = [];
        for (const cmd of this.commands)
            if (cmd.editModeOnly === false || (editMode && cmd.editModeOnly))
                cpCommands.push({ display: `${cmd.caption} (${cmd.shortcut})`, info: cmd.command });
        if (this.plugin.settings.enableDebugMode)
            cpCommands.push({ display: "Reload plugin (Debugging)", info: async (): Promise<void> => this.reloadPlugin() })

        gfs.setSuggesterData(cpCommands);
        gfs.display(async (i: any, evt: MouseEvent | KeyboardEvent) => i.info(evt)); //call the callback
    }

    constructor(plugin: ThePlugin) {
        this.plugin = plugin
        // Combined function
        this.plugin.addCommand({
            id: this.plugin.appID + '-combinedCommands', name: 'All Commands List',
            icon: "TextTransporter",
            callback: async () => {
                await this.masterControlProgram();
            }
        });

        // load context menu settings from plugin settings
        for (let i = 0; i < this.commands.length; i++)
            if (this.commands[i].cmItemEnabled === true && this.plugin.settings["cMenuEnabled-" + this.commands[i].shortcut] !== undefined)
                this.commands[i].cmItemEnabled = this.plugin.settings["cMenuEnabled-" + this.commands[i].shortcut]

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
                for (const value of this.commands)
                    if (value.isContextMenuItem === true && value.cmItemEnabled === true)
                        menu.addItem(item => {
                            item
                                .setTitle(value.caption)
                                .setIcon(value.icon)
                                .onClick(async () => { await value.command() });
                        });
                //load bookmmarks in CM
                for(const bookmark of plugin.settings.bookmarks.split("\n")) {
                    if(bookmark.substr(0,1)==="*") {
                        const bookmarkText = (bookmark.length>=40 ? bookmark.substr(0,40) + "..." : bookmark).replace("*","");
                        menu.addItem(item => {
                            item
                                .setTitle("Copy to: " + bookmarkText)
                                .setIcon("star-list")
                                .onClick(async (e) => await transporter.copyOrPushLineOrSelectionToNewLocationUsingCurrentCursorLocationAndBoomark(plugin, true, bookmark, e))
                        });
                        menu.addItem(item => {
                            item
                            .setTitle("Push to")
                                .setTitle("Push to: " + bookmarkText)
                                .onClick(async (e) => await transporter.copyOrPushLineOrSelectionToNewLocationUsingCurrentCursorLocationAndBoomark(plugin, false, bookmark, e))
                        });
                    }
                }
            })
        );

        for (const value of Object.values(this.commands)) {
            if (value.editModeOnly) {
                this.plugin.addCommand({
                    id: this.plugin.appID + "-" + value.shortcut,
                    icon: value.icon,
                    name: `${value.caption} (${value.shortcut})`,
                    editorCallback: value.command
                });
            } else {
                this.plugin.addCommand({
                    id: this.plugin.appID + "-" + value.shortcut,
                    icon: value.icon,
                    name: `${value.caption} (${value.shortcut})`,
                    callback: value.command
                });
            }
        }
    }
}

