import { TFile, getLinkpath, Editor } from "obsidian";
import ThePlugin from "../main";
import { genericFuzzySuggester, suggesterItem } from "../ui/genericFuzzySuggester";
import { getContextObjects } from "./transporterFunctions";
import { getDnpForToday } from "./dailyNotesPages";

interface fileChooserCallback {
    (targetFileName: string,
        fileContentsArray: Array<suggesterItem>,
        startLine: number,
        endLine: number,
        evtFileselected?: MouseEvent | KeyboardEvent,
        evtFirstLine?: MouseEvent | KeyboardEvent,
        evetLastLine?: MouseEvent | KeyboardEvent)
}

async function createFileChooser(plugin: ThePlugin, excludeFileFromList?: string): Promise<genericFuzzySuggester> {
    const fileList: Array<suggesterItem> = await plugin.fs.getAllFiles("/");
    if (excludeFileFromList) ///don't include this file if needed
        for (let i = 0; i < fileList.length; i++) {
            if (fileList[i].info.localeCompare(excludeFileFromList, undefined, { sensitivity: 'base' }) === 0) {
                fileList.splice(i, 1);
                break;
            }
        }

    // add bookmarks to suggester
    if (plugin.settings.bookmarks.trim().length > 0) {
        const bookmarks = plugin.settings.bookmarks.trim().split('\n')
        for (let i = bookmarks.length - 1; i >= 0; i--) {
            let filePath = bookmarks[i];
            if (filePath.search(";") > 0) filePath = filePath.substr(0, filePath.search(";"));
            filePath = filePath.replace("*","");
            if (filePath === "DNPTODAY" || await plugin.app.vault.adapter.exists(filePath))
                fileList.unshift({ display: "Bookmark: " + bookmarks[i], info: bookmarks[i] })
        }
    }

    const chooser = new genericFuzzySuggester(plugin);
    chooser.setSuggesterData(fileList);
    chooser.setPlaceholder("Select a file")
    return chooser;
}

// convert file into an array based on suggesterITem
async function convertFileIntoArray(plugin: ThePlugin, filePath: string): Promise<Array<suggesterItem>> {
    const fileContentsArray: Array<suggesterItem> = [];
    for (const [key, value] of Object.entries((await plugin.app.vault.adapter.read(filePath)).split('\n')))
        fileContentsArray.push({ display: value, info: key });
    return fileContentsArray;
}

async function openFileInObsidian(plugin: ThePlugin, filePath: string, gotoStartLineNumber = 0, lineCount = 0): Promise<void> {
    const newLeaf = plugin.app.workspace.splitActiveLeaf('vertical');
    const file: TFile = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(filePath), "/");
    await newLeaf.openFile(file, { active: true });
    const editor: Editor = getContextObjects().editor;
    editor.setSelection(
        { line: gotoStartLineNumber, ch: 0 },
        { line: gotoStartLineNumber + lineCount, ch: editor.getLine(gotoStartLineNumber + lineCount).length }
    );
}

interface bookmarkInfo {
    fileName: string;
    fileLineNumber: number;
    fileBookmarkContentsArray: Array<suggesterItem>;
    errorNumber: number;
    contextMenuCommand: boolean;
}

// pullTypeRequest - if it is a pull type reqeust, this should be true, some commands might need different behavior if a pull
async function parseBookmarkForItsElements(plugin: ThePlugin, bookmarkCommandString: string, pullTypeRequest = false): Promise<bookmarkInfo> {
    let error = 0; // error = 0 no problem, 1 = location in file does not exists, 2 file doesnt exist
    let isContextMenuCommand = false;
    if(bookmarkCommandString.substr(0,1)==="*") {
        isContextMenuCommand = true;
        bookmarkCommandString = bookmarkCommandString.substring(1);
    }
    let filePath = bookmarkCommandString.substring(0, bookmarkCommandString.search(";"));
    const command = bookmarkCommandString.substring(filePath.length + 1).toLocaleUpperCase().trim();
    if (filePath === "DNPTODAY") filePath = await getDnpForToday();
    let lineNumber = -1; //default for top
    let fileBkmrkContentsArray: Array<suggesterItem> = null;
    if (await plugin.app.vault.adapter.exists(filePath)) {
        fileBkmrkContentsArray = await convertFileIntoArray(plugin, filePath);
        if (command === "BOTTOM" || command !== "TOP") {
            if (command === "BOTTOM")
                lineNumber = fileBkmrkContentsArray.length - 1;
            else { // bookmark has a location, so find in file.
                for (let i = 0; i < fileBkmrkContentsArray.length; i++) {
                    if (fileBkmrkContentsArray[i].display.toLocaleUpperCase().trim() === command) {
                        lineNumber = pullTypeRequest === true ? i + 1 : i;
                        break;
                    }
                }
                if (lineNumber === -1) error = 1; //location doesnt exist in file
            }
        }
    } else
        error = 2;

    return { 
        fileName: filePath, 
        fileLineNumber: lineNumber, 
        fileBookmarkContentsArray: fileBkmrkContentsArray, 
        errorNumber: error, 
        contextMenuCommand: isContextMenuCommand 
    } 
}

// displays a file selection  suggester,  then the contents of the file, then calls the callback  with:
// Callback function  will receive: Path+FileName, file contents as an array and line choosen
// if returnEndPoint = true, another suggester is shown so user can select endpoint of selection from file
// show top will diplsay -- top at top of suggester
// pullTypeRequest - if it is a pull type reqeust, this should be true, some commands might need different behavior if a pull
async function displayFileLineSuggester(plugin: ThePlugin, returnEndPoint: boolean, showTop: boolean, pullTypeRequest: boolean, callback: fileChooserCallback): Promise<void> {
    const currentFilePath = getContextObjects().currentFile !== null ? getContextObjects().currentFile.path : null;
    const chooser = await createFileChooser(plugin, currentFilePath);

    await chooser.display(async (fileSelected: suggesterItem, evtFileSelected: MouseEvent | KeyboardEvent) => {
        const shiftKeyUsed = evtFileSelected.shiftKey;

        let fileContentsStartingLine = 0;
        let targetFileName = fileSelected.info;

        if (targetFileName.search(";") > 0) { // a bookmark was selected with a command. process callback
            const bkmkInfo = await parseBookmarkForItsElements(plugin, targetFileName, pullTypeRequest);
            console.log(bkmkInfo)
            if (shiftKeyUsed === false) { // bookmark location, perform the transport command
                callback(bkmkInfo.fileName, bkmkInfo.fileBookmarkContentsArray, bkmkInfo.fileLineNumber, bkmkInfo.fileLineNumber, evtFileSelected);
                return;
            } else {  // use the bookmarked location as starting point for next step in commands
                fileContentsStartingLine = bkmkInfo.fileLineNumber;
                targetFileName = bkmkInfo.fileLineNumber;
                showTop = false;
            }
        }

        const fileContentsArray: Array<suggesterItem> = await convertFileIntoArray(plugin, targetFileName);
        if (showTop) fileContentsArray.unshift({ display: "-- Top of file --", info: -1 });

        const firstLinechooser = new genericFuzzySuggester(plugin);
        firstLinechooser.setPlaceholder("Select the line from file")

        if (fileContentsStartingLine > 0)
            firstLinechooser.setSuggesterData(fileContentsArray.slice(fileContentsStartingLine));
        else
            firstLinechooser.setSuggesterData(fileContentsArray);

        await firstLinechooser.display(async (iFileLocation: suggesterItem, evtFirstLine: MouseEvent | KeyboardEvent) => {
            let startFilePosition = Number(iFileLocation.info);
            const endFilePosition = startFilePosition;
            if (showTop) fileContentsArray.splice(0, 1); // remove "-- Top of File -- "
            if (returnEndPoint) { //if expecting endpoint, show suggester again
                if (startFilePosition === fileContentsArray.length - 1) {
                    //only one element in file, or selection is end of file
                    callback(targetFileName, fileContentsArray, startFilePosition, startFilePosition, evtFileSelected, evtFirstLine);
                } else {
                    startFilePosition = startFilePosition === -1 ? 0 : startFilePosition;
                    const endPointArray = fileContentsArray.slice(startFilePosition);
                    const lastLineChooser = new genericFuzzySuggester(plugin);
                    lastLineChooser.setSuggesterData(endPointArray);
                    lastLineChooser.setPlaceholder("Select the last line for the selection")
                    await lastLineChooser.display(async (iFileLocationEndPoint: suggesterItem, evetLastLine: MouseEvent | KeyboardEvent) => {
                        callback(targetFileName, fileContentsArray, startFilePosition, Number(iFileLocationEndPoint.info), evtFileSelected, evtFirstLine, evetLastLine);
                    });
                }
            } else {
                callback(targetFileName, fileContentsArray, startFilePosition, endFilePosition, evtFileSelected, evtFirstLine);
            }
        });
    });
} //displayFileLineSuggester

export { displayFileLineSuggester, convertFileIntoArray, createFileChooser, openFileInObsidian, parseBookmarkForItsElements }