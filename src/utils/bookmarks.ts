import { Notice, MarkdownView } from "obsidian";
import ThePlugin from "../main";
import { genericFuzzySuggester, suggesterItem } from "../ui/genericFuzzySuggester";
import { openFileInObsidian, convertFileIntoArray, parseBookmarkForItsElements } from "./fileNavigator";
import { getDnpForToday } from "./dailyNotesPages";

async function AddBookmarkFromCurrentView(plugin: ThePlugin): Promise<void> {
    const currentView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!currentView || currentView.getMode() !== "source") {
        new Notice("A file must be in source edit mode to add a bookmark");
        return;
    }
    const currentLineText = currentView.editor.getLine(currentView.editor.getCursor().line);
    const locationChooser = new genericFuzzySuggester(this);
    const data = new Array<suggesterItem>();
    data.push({ display: "TOP: Bookmark the top of the file ", info: "TOP" });
    data.push({ display: "TOP: Bookmark the top of the file and mark as a context menu location", info: "TOP*" });
    data.push({ display: "BOTTOM: Bookmark the bottom of the file ", info: "BOTTOM" });
    data.push({ display: "BOTTOM: Bookmark the bottom of the file and mark as a context menu location", info: "BOTTOM*" });
    if (currentLineText.length > 0) {
        data.push({ display: `Location: of selected text "${currentLineText}"`, info: currentLineText });
        data.push({ display: `Location: of selected text and mark as a context menu location "${currentLineText}"`, info: currentLineText + "*" });
    }
    locationChooser.setSuggesterData(data);
    locationChooser.display((location: suggesterItem) => {
        let command = location.info;
        let prefix = "";
        if(location.info.indexOf("*")>0) {
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


async function removeBookmark(plugin: ThePlugin): Promise<void> {
    const bookmarks = plugin.settings.bookmarks.split("\n")
    if (bookmarks.length === 0)
        new Notice("There are no bookmarks defined.")
    else {
        const bookmarkChooser = new genericFuzzySuggester(this);
        const data = new Array<suggesterItem>();
        for (const b of bookmarks)
            data.push({ display: b, info: b });
        bookmarkChooser.setSuggesterData(data);
        bookmarkChooser.display((bookmarkLine: suggesterItem) => {
            const newBookmarks = bookmarks.filter(b => b !== bookmarkLine.info)
            plugin.settings.bookmarks = newBookmarks.join("\n");
            plugin.saveData(plugin.settings);
        });
    }
}

async function openBookmark(plugin: ThePlugin): Promise<void> {
    const bookmarks = plugin.settings.bookmarks.split("\n")
    if (bookmarks.length === 0)
        new Notice("There are no bookmarks defined.")
    else {
        const fileList = new Array<suggesterItem>();
        for (let i = bookmarks.length - 1; i >= 0; i--)
            fileList.unshift({ display: bookmarks[i], info: bookmarks[i] })
        const chooser = new genericFuzzySuggester(plugin);
        chooser.setSuggesterData(fileList);
        chooser.setPlaceholder("Select a file")
        await chooser.display(async (fileSelected: suggesterItem) => {
            const bookmarkInfo = await parseBookmarkForItsElements(plugin, fileSelected.info,false);
            openFileInObsidian(plugin, bookmarkInfo.fileName, bookmarkInfo.fileLineNumber, 0)
        });
    }
}



export { AddBookmarkFromCurrentView, openBookmark, removeBookmark }