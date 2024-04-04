import { Notice, MarkdownView } from "obsidian";
import ThePlugin from "../main";
import { GenericFuzzySuggester, SuggesterItem } from "../ui/genericFuzzySuggester";
import { openFileInObsidian, parseBookmarkForItsElements } from "./fileNavigatior";

// Creates a bookmark from the current selection point. 
// Bookmarks can be created for:
//  Top of file
//  Bottom of file
//  Specific location of file based on matching a string
// Optionally, a bookmark can be added to the context menu by adding an asterisk to the beginning of the line. 
export async function addBookmarkFromCurrentView(plugin: ThePlugin): Promise<void> {
    const currentView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!currentView || currentView.getMode() !== "source") {
        new Notice("A file must be in source edit mode to add a bookmark");
        return;
    }
    const currentLineText = currentView.editor.getLine(currentView.editor.getCursor().line);
    const locationChooser = new GenericFuzzySuggester(this);
    const data = new Array<SuggesterItem>();
    data.push({ display: "TOP: Bookmark the top of the file ", info: "TOP" });
    data.push({ display: "TOP: Bookmark the top of the file and mark as a context menu location", info: "TOP*" });
    data.push({ display: "BOTTOM: Bookmark the bottom of the file ", info: "BOTTOM" });
    data.push({ display: "BOTTOM: Bookmark the bottom of the file and mark as a context menu location", info: "BOTTOM*" });
    if (currentLineText.length > 0) {
        data.push({ display: `Location: of selected text "${currentLineText}"`, info: currentLineText });
        data.push({ display: `Location: of selected text and mark as a context menu location "${currentLineText}"`, info: currentLineText + "*" });
    }
    locationChooser.setSuggesterData(data);
    locationChooser.display((location: SuggesterItem) => {
        let command = location.info;
        let prefix = "";
        if (location.info.indexOf("*") > 0) {
            command = command.replace("*", "");
            prefix = "*";
        }
        if (location) {
            const newBookmark = prefix + currentView.file.path + ";" + command;
            if (plugin.settings.bookmarks.split("\n").find(b => b === newBookmark))
                new Notice(`The bookmark: ${newBookmark} already exists.`)
            else {
                plugin.settings.bookmarks = plugin.settings.bookmarks.trim() + "\n" + newBookmark;
                plugin.saveData(plugin.settings);
                new Notice(`The bookmark: ${newBookmark} saved.`)
            }
        }
    });
}

// Quick way to remove a bookmark from the bookmarks list
export async function removeBookmark(plugin: ThePlugin): Promise<void> {
    const bookmarks = plugin.settings.bookmarks.split("\n")
    if (bookmarks.length === 0)
        new Notice("There are no bookmarks defined.")
    else {
        const bookmarkChooser = new GenericFuzzySuggester(this);
        const data = new Array<SuggesterItem>();
        for (const b of bookmarks)
            data.push({ display: b, info: b });
        bookmarkChooser.setSuggesterData(data);
        bookmarkChooser.display((bookmarkLine: SuggesterItem) => {
            const newBookmarks = bookmarks.filter(b => b !== bookmarkLine.info)
            plugin.settings.bookmarks = newBookmarks.join("\n");
            plugin.saveData(plugin.settings);
        });
    }
}

// Open the file of a bookmark at its defined location
export async function openBookmark(plugin: ThePlugin): Promise<void> {
    const bookmarks = plugin.settings.bookmarks.split("\n")
    if (bookmarks.length === 0)
        new Notice("There are no bookmarks defined.")
    else {
        const fileList = new Array<SuggesterItem>();
        for (let i = bookmarks.length - 1; i >= 0; i--)
            fileList.unshift({ display: bookmarks[i], info: bookmarks[i] })
        const chooser = new GenericFuzzySuggester(plugin);
        chooser.setSuggesterData(fileList);
        chooser.setPlaceholder("Select a file")
        await chooser.display(async (fileSelected: SuggesterItem) => {
            const bookmarkInfo = await parseBookmarkForItsElements(plugin, fileSelected.info, false);
            openFileInObsidian(plugin, bookmarkInfo.fileName, bookmarkInfo.fileLineNumber, 0)
        });
    }
}
