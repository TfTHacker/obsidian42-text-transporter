import { TFile, getLinkpath, Editor, Notice } from "obsidian";
import ThePlugin from "../main";
import { GenericFuzzySuggester, SuggesterItem } from "../ui/GenericFuzzySuggester";
import { getDnpForToday, getDnpForTomorrow } from "./dailyNotesPages";
import { blocksWhereTagIsUsed, filesWhereTagIsUsed, getAllTagsJustTagNames } from "./tags";
import { getActiveView, getActiveViewType, ViewType } from "./views";

export interface FileChooserCallback {
    (targetFileName: string,
        fileContentsArray: Array<SuggesterItem>,
        startLine: number,
        endLine: number,
        evtFileselected?: MouseEvent | KeyboardEvent,
        evtFirstLine?: MouseEvent | KeyboardEvent,
        evetLastLine?: MouseEvent | KeyboardEvent)
}

const TAG_FILE_SEARCH = "#### #tag file search ####";
const TAG_BLOCK_SEARCH = "---- #tag block search ----";

export const getUniqueLinkPath = (filePath: string): string => {
    //@ts-ignore
    return app.metadataCache.fileToLinktext(app.vault.getAbstractFileByPath(filePath), "");
}

export async function createFileChooser(plugin: ThePlugin, excludeFileFromList?: string): Promise<GenericFuzzySuggester> {
    const fileList: Array<SuggesterItem> = await plugin.fs.getAllFiles();
    if (excludeFileFromList) ///don't include this file if needed
        for (let i = 0; i < fileList.length; i++) {
            if (fileList[i].info.localeCompare(excludeFileFromList, undefined, { sensitivity: 'base' }) === 0) {
                fileList.splice(i, 1);
                break;
            }
        }

    fileList.unshift({ display: TAG_BLOCK_SEARCH, info: TAG_BLOCK_SEARCH });
    fileList.unshift({ display: TAG_FILE_SEARCH, info: TAG_FILE_SEARCH });

    // add bookmarks to suggester
    if (plugin.settings.bookmarks.trim().length > 0) {
        const bookmarks = plugin.settings.bookmarks.trim().split('\n')
        for (let i = bookmarks.length - 1; i >= 0; i--) {
            let filePath = bookmarks[i];
            if (filePath.search(";") > 0) filePath = filePath.substr(0, filePath.search(";"));
            filePath = filePath.replace("*", "");
            if (filePath === "DNPTODAY" || filePath === "DNPTOMORROW" || await plugin.app.vault.adapter.exists(filePath))
                fileList.unshift({ display: "Bookmark: " + bookmarks[i], info: bookmarks[i] })
        }
    }

    const chooser = new GenericFuzzySuggester(plugin);
    chooser.setSuggesterData(fileList);
    chooser.setPlaceholder("Select a file")
    return chooser;
}

// convert file into an array based on suggesterITem
export async function convertFileIntoArray(plugin: ThePlugin, filePath: string): Promise<Array<SuggesterItem>> {
    const fileContentsArray: Array<SuggesterItem> = [];
    for (const [key, value] of Object.entries((await plugin.app.vault.adapter.read(filePath)).split('\n')))
        fileContentsArray.push({ display: value, info: key });
    return fileContentsArray;
}

export async function openFileInObsidian(plugin: ThePlugin, filePath: string, gotoStartLineNumber = 0, lineCount = 0): Promise<void> {
    const newLeaf = plugin.app.workspace.splitActiveLeaf('vertical');
    const file: TFile = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(filePath), "/");
    await newLeaf.openFile(file, { active: true });
    setTimeout(async () => {
        const editor: Editor = getActiveView(plugin).editor;
        editor.setSelection(
            { line: gotoStartLineNumber, ch: 0 },
            { line: gotoStartLineNumber + lineCount, ch: editor.getLine(gotoStartLineNumber + lineCount).length }
        );
        editor.scrollIntoView({
            from: { line: gotoStartLineNumber + lineCount, ch: 0 },
            to: { line: gotoStartLineNumber + lineCount, ch: 0 }
        });
    }, 500);
}

export interface bookmarkInfo {
    fileName: string;
    fileLineNumber: number;
    fileBookmarkContentsArray: Array<SuggesterItem>;
    errorNumber: number;
    contextMenuCommand: boolean;
}

// pullTypeRequest - if it is a pull type reqeust, this should be true, some commands might need different behavior if a pull
export async function parseBookmarkForItsElements(plugin: ThePlugin, bookmarkCommandString: string, pullTypeRequest = false): Promise<bookmarkInfo> {
    let error = 0; // error = 0 no problem, 1 = location in file does not exists, 2 file doesnt exist
    let isContextMenuCommand = false;
    if (bookmarkCommandString.substr(0, 1) === "*") {
        isContextMenuCommand = true;
        bookmarkCommandString = bookmarkCommandString.substring(1);
    }
    let filePath = bookmarkCommandString.substring(0, bookmarkCommandString.search(";"));
    const command = bookmarkCommandString.substring(filePath.length + 1).toLocaleUpperCase().trim();
    try {
        if (filePath === "DNPTODAY") filePath = await getDnpForToday();
        if (filePath === "DNPTOMORROW") filePath = await getDnpForTomorrow();
        let lineNumber = -1; //default for top
        let fileBkmrkContentsArray: Array<SuggesterItem> = null;
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
    } catch (e) {
        new Notice("Something is wrong with the bookmark. File system reports: " + e.toString());
        error = 2;
    }
}

export async function createTagFileListChooser(plugin: ThePlugin, returnEndPoint: boolean, showTop: boolean, callback: FileChooserCallback): Promise<void> {
    const tagList = getAllTagsJustTagNames();
    if (tagList.length <= 0) {
        new Notice("No tags in this vault");
        return;
    }

    const tagListArray: Array<SuggesterItem> = [];
    for (const tag of tagList)
        tagListArray.push({ display: tag, info: tag })

    const tagChooser = new GenericFuzzySuggester(plugin);
    tagChooser.setSuggesterData(tagListArray);
    tagChooser.setPlaceholder("Select a tag");
    await tagChooser.display(async (tagChosen: SuggesterItem) => {
        const tagFileListArray: Array<SuggesterItem> = [];
        const filesForChosenTag = filesWhereTagIsUsed(tagChosen.info);
        for (const tag of filesForChosenTag)
            tagFileListArray.push({ display: tag, info: tag })

        const tagFileChooser = new GenericFuzzySuggester(plugin);
        tagFileChooser.setSuggesterData(tagFileListArray);
        tagFileChooser.setPlaceholder("Select a file");

        await tagFileChooser.display(async (fieleChosen: SuggesterItem, evtFile: MouseEvent | KeyboardEvent) => {
            const fileContentsArray: Array<SuggesterItem> = await convertFileIntoArray(plugin, fieleChosen.info);
            if (showTop) fileContentsArray.unshift({ display: "-- Top of file --", info: -1 });
            await displayFileLineSuggesterFromFileList(plugin, returnEndPoint, showTop, fieleChosen.info, fileContentsArray, 0, evtFile, callback);
        });
    });
}

export async function createTagBlockListChooser(plugin: ThePlugin, returnEndPoint: boolean, showTop: boolean, callback: FileChooserCallback): Promise<void> {
    const tagList = getAllTagsJustTagNames();
    if (tagList.length <= 0) {
        new Notice("No tags in this vault");
        return;
    }

    const tagListArray: Array<SuggesterItem> = [];
    for (const tag of tagList)
        tagListArray.push({ display: tag, info: tag })

    const tagChooser = new GenericFuzzySuggester(plugin);
    tagChooser.setSuggesterData(tagListArray);
    tagChooser.setPlaceholder("Select a tag");
    await tagChooser.display(async (tagChosen: SuggesterItem) => {
        const tagFileListArray: Array<SuggesterItem> = [];
        const tagBlocks = blocksWhereTagIsUsed(plugin, tagChosen.info);
        for (const tag of await tagBlocks)
            tagFileListArray.push({ display: tag.file + "\n" + tag.blockText, info: tag })

        const tagBlockChooser = new GenericFuzzySuggester(plugin);
        tagBlockChooser.setSuggesterData(tagFileListArray);
        tagBlockChooser.setPlaceholder("Select a block");

        await tagBlockChooser.display(async (tagBlock: SuggesterItem, evt: MouseEvent | KeyboardEvent) => {
            callback(tagBlock.info.file, await convertFileIntoArray(plugin, tagBlock.info.file), tagBlock.info.position.start.line, tagBlock.info.position.end.line, evt);
        });
    });
}

// displays a file selection  suggester,  then the contents of the file, then calls the callback  with:
// Callback function  will receive: Path+FileName, file contents as an array and line choosen
// if returnEndPoint = true, another suggester is shown so user can select endpoint of selection from file
// show top will diplsay -- top at top of suggester
// pullTypeRequest - if it is a pull type reqeust, this should be true, some commands might need different behavior if a pull
export async function displayFileLineSuggester(plugin: ThePlugin, returnEndPoint: boolean, showTop: boolean, pullTypeRequest: boolean, callback: FileChooserCallback): Promise<void> {
    const chooser = getActiveViewType(plugin) === ViewType.none ? await createFileChooser(plugin) : await createFileChooser(plugin, getActiveView(plugin).file.path);
    await chooser.display(async (fileSelected: SuggesterItem, evtFileSelected: MouseEvent | KeyboardEvent) => {
        const shiftKeyUsed = evtFileSelected.shiftKey;

        let fileContentsStartingLine = 0;
        let targetFileName = fileSelected.info;

        if (targetFileName === TAG_FILE_SEARCH) {
            await createTagFileListChooser(plugin, returnEndPoint, showTop, callback);
            return;
        } else if (targetFileName === TAG_BLOCK_SEARCH) {
            await createTagBlockListChooser(plugin, returnEndPoint, showTop, callback);
            return;
        } else if (targetFileName.search(";") > 0) { // a bookmark was selected with a command. process callback
            const bkmkInfo = await parseBookmarkForItsElements(plugin, targetFileName, pullTypeRequest);
            if (shiftKeyUsed === false) { // bookmark location, perform the transport command
                callback(bkmkInfo.fileName, bkmkInfo.fileBookmarkContentsArray, bkmkInfo.fileLineNumber, bkmkInfo.fileLineNumber, evtFileSelected);
                return;
            } else {  // use the bookmarked location as starting point for next step in commands
                fileContentsStartingLine = bkmkInfo.fileLineNumber;
                targetFileName = bkmkInfo.fileName;
                showTop = false;
            }
        }

        const fileContentsArray: Array<SuggesterItem> = await convertFileIntoArray(plugin, targetFileName);
        if (showTop) fileContentsArray.unshift({ display: "-- Top of file --", info: -1 });

        await displayFileLineSuggesterFromFileList(plugin, returnEndPoint, showTop, targetFileName, fileContentsArray, fileContentsStartingLine, evtFileSelected, callback);
    });
}

// supports displayFileLineSuggester and displayTagFileSuggester
export async function displayFileLineSuggesterFromFileList(plugin: ThePlugin, returnEndPoint: boolean, showTop: boolean, targetFileName: string,
    fileContentsArray: Array<SuggesterItem>, fileContentsStartingLine: number,
    evtFileSelected: MouseEvent | KeyboardEvent, callback: FileChooserCallback): Promise<void> {
    const firstLinechooser = new GenericFuzzySuggester(plugin);
    firstLinechooser.setPlaceholder("Select the line from file")

    const lineCountArray: SuggesterItem[] = fileContentsArray.map(item => {
        const lineNumber = Number(item.info) + 1;
        return { display: (lineNumber > 0 ? lineNumber + " " : "") + item.display, info: item.info };
    });

    if (fileContentsStartingLine > 0)
        firstLinechooser.setSuggesterData(lineCountArray.slice(fileContentsStartingLine));
    else
        firstLinechooser.setSuggesterData(lineCountArray);

    await firstLinechooser.display(async (iFileLocation: SuggesterItem, evtFirstLine: MouseEvent | KeyboardEvent) => {
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
                const lastLineChooser = new GenericFuzzySuggester(plugin);
                lastLineChooser.setSuggesterData(endPointArray);
                lastLineChooser.setPlaceholder("Select the last line for the selection")
                await lastLineChooser.display(async (iFileLocationEndPoint: SuggesterItem, evetLastLine: MouseEvent | KeyboardEvent) => {
                    callback(targetFileName, fileContentsArray, startFilePosition, Number(iFileLocationEndPoint.info), evtFileSelected, evtFirstLine, evetLastLine);
                });
            }
        } else {
            callback(targetFileName, fileContentsArray, startFilePosition, endFilePosition, evtFileSelected, evtFirstLine);
        }
    });

}
