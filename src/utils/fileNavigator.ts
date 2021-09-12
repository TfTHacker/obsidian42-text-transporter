import { Notice, TFile, getLinkpath, Editor } from "obsidian";
import ThePlugin from "../main";
import { genericFuzzySuggester, suggesterItem } from "../ui/genericFuzzySuggester";
import { getContextObjects } from "./transporterFunctions";
import { getDnpForToday } from "./dailyNotesPages";

interface fileChooserCallback {
    ( targetFileName: string, 
      fileContentsArray: Array<suggesterItem>, 
      startLine: number, 
      endLine: number, 
      evtFileselected?: MouseEvent | KeyboardEvent,
      evtFirstLine?: MouseEvent | KeyboardEvent,
      evetLastLine?: MouseEvent | KeyboardEvent)
}

async function createFileChooser(plugin: ThePlugin, excludeFileFromList?: string): Promise<genericFuzzySuggester> {
    const fileList: Array<suggesterItem> = await plugin.fs.getAllFiles("/");
    if(excludeFileFromList) ///don't include this file if needed
        for (let i = 0; i < fileList.length; i++)
            if (fileList[i].info.localeCompare(excludeFileFromList, undefined, { sensitivity: 'base' }) === 0) {
                fileList.splice(i, 1);
                break;
            }

    // add bookmarks to suggester
    if (plugin.settings.bookmarks.trim().length > 0) {
        const bookmarks = plugin.settings.bookmarks.trim().split('\n')
        for (let i = bookmarks.length - 1; i >= 0; i--) {
            let filePath = bookmarks[i];
            if (filePath.search(";") > 0) filePath = filePath.substr(0, filePath.search(";"));
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

async function openFileInObsidian(plugin: ThePlugin, filePath: string, gotoStartLineNumber = 0,  lineCount = 0): Promise<void> {
    const newLeaf = plugin.app.workspace.splitActiveLeaf('vertical');
    const file: TFile = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(filePath), "/");
    await newLeaf.openFile(file, { active: true });
    const editor: Editor = getContextObjects().editor;
    editor.setSelection(
        {line: gotoStartLineNumber, ch:0}, 
        {line: gotoStartLineNumber+lineCount, ch: editor.getLine(gotoStartLineNumber+lineCount).length }
    );
}

// displays a file selection  suggester,  then the contents of the file, then calls the callback  with:
// Callback function  will receive: Path+FileName, file contents as an array and line choosen
// if returnEndPoint = true, another suggester is shown so user can select endpoint of selection from file
// show top will diplsay -- top at top of suggester
// pullTypeRequest - iff it is a pull type reqeust, this should be true, some commands might need different behavior if a pull
async function displayFileLineSuggester(plugin: ThePlugin, returnEndPoint: boolean, showTop: boolean, pullTypeRequest: boolean, callback: fileChooserCallback): Promise<void> {
    const currentFilePath = getContextObjects().currentFile!==null ? getContextObjects().currentFile.path : null;
    const chooser = await createFileChooser(plugin, currentFilePath);

    await chooser.display(async (fileSelected: suggesterItem, evtFileSelected: MouseEvent | KeyboardEvent) => {
        const shiftKeyUsed = evtFileSelected.shiftKey;

        let fileContentsStartingLine = 0;
        let targetFileName = fileSelected.info;

        if (plugin.settings.enableDNP && targetFileName === plugin.dnpHeaderForFileSelector) {
            targetFileName = getDnpForToday();
        } else if (targetFileName.search(";") > 0) { // a bookmark was selected with a command. process callback
            let filePath = targetFileName.substring(0, targetFileName.search(";"));
            const command = targetFileName.substring(filePath.length + 1).toLocaleUpperCase().trim();
            if (filePath === "DNPTODAY") filePath = await getDnpForToday();
            let lineNumber = -1; //default for top
            const fileBookmarkContentsArray: Array<suggesterItem> = await convertFileIntoArray(plugin, filePath);
            if (command === "BOTTOM" || command !== "TOP") {
                if (command === "BOTTOM")
                    lineNumber = fileBookmarkContentsArray.length - 1;
                else { // bookmark has a location, so find in file.
                    for (let i = 0; i < fileBookmarkContentsArray.length; i++) {
                        if (fileBookmarkContentsArray[i].display.toLocaleUpperCase().trim() === command) {
                            lineNumber = pullTypeRequest === true ? i + 1 : i;
                            break;
                        }
                    }
                    if (lineNumber === -1) {
                        new Notice("The location was not found in the file: \n\n" + targetFileName.substring(filePath.length + 1), 10000);
                        return;
                    }
                }
            }
            if (shiftKeyUsed===false) { // bookmark location, perform the transport command
                callback(filePath, fileBookmarkContentsArray, lineNumber, lineNumber, evtFileSelected);
                return;
            } else {  // use the bookmarked location as starting point for next step in commands
                fileContentsStartingLine = lineNumber;
                targetFileName = filePath;
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
                        callback(targetFileName, fileContentsArray, startFilePosition,  Number(iFileLocationEndPoint.info), evtFileSelected, evtFirstLine, evetLastLine);
                    });
                }
            } else {
                callback(targetFileName, fileContentsArray, startFilePosition, endFilePosition, evtFileSelected, evtFirstLine);
            }
        });
    });
} //displayFileLineSuggester

export { displayFileLineSuggester, convertFileIntoArray, createFileChooser, openFileInObsidian }