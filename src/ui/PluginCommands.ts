import ThePlugin from "../main";
import { GenericFuzzySuggester, SuggesterItem } from "./genericFuzzySuggester";
import * as transporter from "../features/transporterFunctions"
import * as selectionTools from "../features/selectionFunctions";
import { Notice, MarkdownView } from "obsidian";
import QuickCaptureModal from "./quickCapture";
import { addBookmarkFromCurrentView, openBookmark, removeBookmark } from "../utils/bookmarks";
import { getActiveViewType, ViewType } from "../utils/views";

export default class PluginCommands {
    plugin: ThePlugin;
    // commands notes
    // shortcut - MUST be unique, used as part of the Command Palette ID
    // isContextMenuItem - this is a context menu item or not
    // cmItemEnabled - is the context menu item enabled 
    commands = [
        {
            caption: "Quick Capture", shortcut: "QC", group: "QuickCapture", editModeOnly: false, isContextMenuItem: false, cmItemEnabled: false, icon: "highlight-glyph",
            command: async (): Promise<void> => (new QuickCaptureModal(this.plugin)).open()
        },
        {
            caption: "Select current line/expand to block", shortcut: "SB", group: "Selection", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "highlight-glyph",
            command: async (): Promise<void> => selectionTools.selectCurrentLine(this.plugin)
        },
        {
            caption: "Select block - previous", shortcut: "BP", group: "Selection", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "highlight-glyph",
            command: async (): Promise<void> => selectionTools.selectAdjacentBlock(this.plugin, false)
        },
        {
            caption: "Select block - next", shortcut: "BN", group: "Selection", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "highlight-glyph",
            command: async (): Promise<void> => selectionTools.selectAdjacentBlock(this.plugin, true)
        },
        {
            caption: "Select current line/expand up into previous block", group: "Selection", shortcut: "SP", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "highlight-glyph",
            command: async (): Promise<void> => selectionTools.selectCurrentSection(this.plugin, true)
        },
        {
            caption: "Select current line/expand down into next block", group: "Selection", shortcut: "SN", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "highlight-glyph",
            command: async (): Promise<void> => selectionTools.selectCurrentSection(this.plugin, false)
        },
        {
            caption: "Replace link with text", shortcut: "RLT", group: "replace", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "lines-of-text",
            command: async (): Promise<void> => {
                const linkInfo = transporter.testIfCursorIsOnALink(this.plugin);
                if (linkInfo)
                    await transporter.copyBlockReferenceToCurrentCusorLocation(this.plugin, linkInfo, false);
                else
                    new Notice("No link selected in editor.")
            }
        },
        {
            caption: "Replace link with text & alias", shortcut: "RLA", group: "replace", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "lines-of-text",
            command: async (): Promise<void> => {
                const linkInfo = transporter.testIfCursorIsOnALink(this.plugin);
                if (linkInfo)
                    await transporter.copyBlockReferenceToCurrentCusorLocation(this.plugin, linkInfo, true);
                else
                    new Notice("No link selected in editor.")
            }
        },
        {
            caption: "Copy block embeds from this selection", shortcut: "CC", group: "block", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "blocks",
            command: async (): Promise<Array<string>> => transporter.addBlockRefsToSelection(this.plugin, true)
        },
        {
            caption: "Copy block embeds as an alias", shortcut: "CA", group: "block", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "blocks",
            command: async (): Promise<Array<string>> => transporter.addBlockRefsToSelection(this.plugin, true, true, this.plugin.settings.blockRefAliasIndicator)
        },
        {
            caption: "Copy line/selection to another file", shortcut: "CLT", group: "ToFile", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "left-arrow-with-tail",
            command: async (): Promise<void> => transporter.copyOrPushLineOrSelectionToNewLocationWithFileLineSuggester(this.plugin, true)
        },
        {
            caption: "Push line/selection to another file", shortcut: "PLT", group: "ToFile", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "left-arrow-with-tail",
            command: async (): Promise<void> => transporter.copyOrPushLineOrSelectionToNewLocationWithFileLineSuggester(this.plugin, false)
        },
        {
            caption: "Push line/selection to another file as a block embed", shortcut: "PLB", group: "ToFile", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "left-arrow-with-tail",
            command: async (): Promise<void> => transporter.pushBlockReferenceToAnotherFile(this.plugin)
        },
        {
            caption: "Send link of current note to a file", shortcut: "SLF", editModeOnly: true, group: "Send", isContextMenuItem: true, cmItemEnabled: true, icon: "paper-plane",
            command: async (): Promise<void> => transporter.copyCurrentFileNameAsLinkToNewLocation(this.plugin, false)
        },
        {
            caption: "Send link of current note to the Clipboard", shortcut: "SLC", editModeOnly: true, group: "Send", isContextMenuItem: true, cmItemEnabled: true, icon: "paper-plane",
            command: async (): Promise<void> => transporter.copyCurrentFileNameAsLinkToNewLocation(this.plugin, true)
        },
        {
            caption: "Copy line(s) from another file", shortcut: "CLF", editModeOnly: true, group: "FromFile", isContextMenuItem: true, cmItemEnabled: true, icon: "right-arrow-with-tail",
            command: async (): Promise<void> => transporter.copyOrPulLineOrSelectionFromAnotherLocation(this.plugin, true)
        },
        {
            caption: "Pull line(s) from another file", shortcut: "LLF", editModeOnly: true, group: "FromFile", isContextMenuItem: true, cmItemEnabled: true, icon: "right-arrow-with-tail",
            command: async (): Promise<void> => transporter.copyOrPulLineOrSelectionFromAnotherLocation(this.plugin, false)
        },
        {
            caption: "Pull Line(s) from another file as block embeds", shortcut: "LLB", group: "FromFile", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "right-arrow-with-tail",
            command: async (): Promise<void> => transporter.pullBlockReferenceFromAnotherFile(this.plugin)
        },
        {
            caption: "Add a New Bookmark from this file", shortcut: "BA", group: "Bookmarks", editModeOnly: true, isContextMenuItem: true, cmItemEnabled: true, icon: "go-to-file",
            command: async (): Promise<void> => addBookmarkFromCurrentView(this.plugin)
        },
        {
            caption: "Open a bookmarked file", shortcut: "BO", group: "Bookmarks", editModeOnly: false, isContextMenuItem: false, cmItemEnabled: false, icon: "go-to-file",
            command: async (): Promise<void> => await openBookmark(this.plugin)
        },
        {
            caption: "Remove a Bookmark", shortcut: "BR", group: "Bookmarks", editModeOnly: true, isContextMenuItem: false, cmItemEnabled: false, icon: "go-to-file",
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
    async masterControlProgram(plugin: ThePlugin): Promise<void> { // Yes this is a reference to Tron https://www.imdb.com/title/tt0084827/
        const currentView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        let editMode = true;
        if (!currentView || currentView.getMode() !== "source") editMode = false;

        const gfs = new GenericFuzzySuggester(this.plugin);
        const cpCommands: Array<SuggesterItem> = [];
        for (const cmd of this.commands) {
            const activeView = getActiveViewType(plugin);
            let addCommand = false;
            if (cmd.group==="replace" && activeView===ViewType.source && transporter.testIfCursorIsOnALink(this.plugin)) 
                addCommand = true;
            else if (cmd.group!== "replace" &&  (cmd.editModeOnly === false || (editMode && cmd.editModeOnly)))
                addCommand = true;
            else if((cmd.shortcut==="SLF" || cmd.shortcut==="SLC") && activeView!=ViewType.none) { //send command. show file exists
                addCommand = true;
            }
            if (addCommand)
                cpCommands.push({ display: `${cmd.caption} (${cmd.shortcut})`, info: cmd.command });
        }

        if (editMode) {
            for (const bookmark of plugin.settings.bookmarks.split("\n")) {
                if (bookmark.substr(0, 1) === "*") {
                    cpCommands.push({ display: `Copy to: ${bookmark}`, info: async (e) => { await transporter.copyOrPushLineOrSelectionToNewLocationUsingCurrentCursorLocationAndBoomark(plugin, true, bookmark, e) } });
                    cpCommands.push({ display: `   Push: ${bookmark}`, info: async (e) => { await transporter.copyOrPushLineOrSelectionToNewLocationUsingCurrentCursorLocationAndBoomark(plugin, false, bookmark, e) } });
                }
            }
        }

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
                await this.masterControlProgram(this.plugin);
            }
        });false

        // load context menu settings from plugin settings
        for (let i = 0; i < this.commands.length; i++)
            if (this.plugin.settings["cMenuEnabled-" + this.commands[i].shortcut] !== undefined)
                this.commands[i].cmItemEnabled = this.plugin.settings["cMenuEnabled-" + this.commands[i].shortcut]

        this.plugin.registerEvent(
            this.plugin.app.workspace.on("editor-menu", (menu) => {
                menu.addSeparator();
                for (const value of this.commands) { 
                    let addCommand = false;
                    if (value.cmItemEnabled === true && value.group!=="replace")
                        addCommand=true;
                    else if (value.cmItemEnabled === true && value.group==="replace" && transporter.testIfCursorIsOnALink(this.plugin)) 
                        addCommand=true;
                    if(addCommand) {
                        menu.addItem(item => {
                            item
                                .setTitle(value.caption)
                                .setIcon(value.icon)
                                .onClick(async () => { await value.command() });
                        });                        
                    }
                }
                //load bookmmarks in CM
                const bookmarks = plugin.settings.bookmarks.split("\n");
                if(bookmarks.length>0) {
                    menu.addSeparator();
                    for (const bookmark of bookmarks) {
                        if (bookmark.substr(0, 1) === "*") {
                            const bookmarkText = (bookmark.length >= 40 ? bookmark.substr(0, 40) + "..." : bookmark).replace("*", "");
                            menu.addItem(item => {
                                item
                                    .setTitle("Copy to: " + bookmarkText)
                                    .setIcon("star-list")
                                    .onClick(async (e) => await transporter.copyOrPushLineOrSelectionToNewLocationUsingCurrentCursorLocationAndBoomark(plugin, true, bookmark, e))
                            });
                            menu.addItem(item => {
                                item
                                    .setTitle("Push to: " + bookmarkText)
                                    .onClick(async (e) => await transporter.copyOrPushLineOrSelectionToNewLocationUsingCurrentCursorLocationAndBoomark(plugin, false, bookmark, e))
                            });
                        }
                    }
                }
                menu.addSeparator();
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

