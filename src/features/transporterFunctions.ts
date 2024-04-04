import { TFile, Notice, LinkCache, getLinkpath } from "obsidian";
import ThePlugin from '../main';
import { FileCacheAnalyzer, CacheDetails } from '../utils/fileCacheAnalyzer';
import { SuggesterItem } from "../ui/genericFuzzySuggester";
import { displayFileLineSuggester, openFileInObsidian, parseBookmarkForItsElements, getUniqueLinkPath } from "../utils/fileNavigatior";
import { generateBlockId } from "../utils/blockId";
import { getActiveView } from "../utils/views";

export function cleanupHeaderNameForBlockReference(header: string): string {
    return header.replace(/\[|\]|#|\|/g, '').replace(/:/g, ' ');
}

// loops through current selected text and adds block refs to each paragraph
// returns all block refs found in selection
// optionally copies them to clipboard
export async function addBlockRefsToSelection(plugin: ThePlugin, copyToClipbard: boolean, copyAsAlias = false, aliasText = "*"): Promise<Array<string>> {
    const activeView = getActiveView(plugin);
    const activeEditor = activeView.editor;    
    const f = new FileCacheAnalyzer(plugin, activeView.file.path);
    const curSels = activeEditor.listSelections();
    const blockRefs = [];
    for (const sel of curSels) {
        const startLine = sel.anchor.line > sel.head.line ? sel.head.line : sel.anchor.line;
        const endLine = sel.anchor.line > sel.head.line ? sel.anchor.line : sel.head.line;
        for (let selectedLineInEditor = startLine; selectedLineInEditor <= endLine; selectedLineInEditor++) {
            for (let sectionCounter = 0; sectionCounter < f.details.length; sectionCounter++) {
                const section = f.details[sectionCounter];
                if (selectedLineInEditor >= section.position.start.line && selectedLineInEditor <= section.position.end.line) {
                    if ((section.type === "paragraph" || section.type === "list" || section.type === "blockquote" ) && !section.blockId) {
                        const newId = generateBlockId();
                        activeEditor.replaceRange(` ^${newId}`, { line: Number(section.position.end.line), ch: section.position.end.col }, { line: Number(section.position.end.line), ch: section.position.end.col });
                        blockRefs.push("#^" + newId);
                        selectedLineInEditor = section.position.end.line;
                        break;
                    } else if (section.type === "paragraph" || section.type === "list" || section.type === "blockquote") {
                        blockRefs.push("#^" + section.blockId);
                        selectedLineInEditor = section.position.end.line;
                        break;
                    } else if (section.type === "heading") {
                        blockRefs.push("#" + cleanupHeaderNameForBlockReference(section.headingText));
                        selectedLineInEditor = section.position.end.line;
                        break;
                    }
                }
            }
        } //selectedLineInEditor
    } //curSels

    if (copyToClipbard && blockRefs.length > 0) {
        let block = "";
        const blockPrefix = copyAsAlias === false ? "!" : ""; //if alias, don't do embed preview
        aliasText = copyAsAlias === true ? "|" + aliasText : "";    
        const uniqueLinkPath = getUniqueLinkPath(activeView.file.path);
        blockRefs.forEach(b => block += `${blockPrefix}[[${uniqueLinkPath}${b}${aliasText}]]\n`);
        navigator.clipboard.writeText(block).then(text => text);
    }
    return blockRefs;
}

export async function copyOrPushLineOrSelectionToNewLocation(plugin: ThePlugin, copySelection: boolean, newText: string, targetFileName:string,  targetFileLineNumber:number, targetFileContentsArray: Array<SuggesterItem>): Promise<void> {
    if (targetFileLineNumber === -1) { //go to top of file, but test for YAML
        const f = new FileCacheAnalyzer(plugin, targetFileName);
        if (f.details.length > 0 && f.details[0].type === "yaml")
            targetFileLineNumber = f.details[0].lineEnd;
    }
    targetFileContentsArray.splice(Number(targetFileLineNumber) + 1, 0, { display: newText, info: "" });
    let newContents = "";
    for (const line of targetFileContentsArray)
        newContents += line.display + "\n";
    newContents = newContents.substring(0, newContents.length - 1);
    await plugin.app.vault.adapter.write(targetFileName, newContents);
    if (copySelection === false) {//this  is  a move, so delete the selection
        const activeEditor = getActiveView(plugin).editor;    
        const currentLine = activeEditor.getCursor().line;
        const textSelection = activeEditor.getSelection();
        if (textSelection === "" || activeEditor.getLine(currentLine).length === textSelection.length)
            activeEditor.replaceRange("", { line: currentLine, ch: 0 }, { line: currentLine + 1, ch: 0 })
        else
            activeEditor.replaceSelection(""); //replace whatever is the  selection
    }
} 

// Copies or pushes (transfers) the current line or selection to another file
// copySelection = true for copy, false for move
// defaultSelectionText  (use this function to push text, without changes to local editor)
export async function copyOrPushLineOrSelectionToNewLocationWithFileLineSuggester(plugin: ThePlugin, copySelection: boolean, defaultSelectionText = ""): Promise<void> {
    const activeEditor = defaultSelectionText === "" ? getActiveView(plugin).editor : null;
    let selectedText = defaultSelectionText === "" ? activeEditor.getSelection() : defaultSelectionText;
    if (selectedText === "") selectedText = activeEditor.getLine(activeEditor.getCursor().line); //get text from current line
    await displayFileLineSuggester(plugin, false, true, false, async (targetFileName, fileContentsArray, lineNumber, endLineNumber, evtFileSelected, evtFirstLine) => {
        await copyOrPushLineOrSelectionToNewLocation(plugin, copySelection, selectedText, targetFileName, lineNumber, fileContentsArray);
        if ((evtFileSelected && (evtFileSelected.ctrlKey || evtFileSelected.metaKey)) || (evtFirstLine && (evtFirstLine.ctrlKey || evtFirstLine.metaKey))) {
            const linesSelected = selectedText.split("\n").length;
            const lineCount = linesSelected > 1 ? linesSelected - 1 : 0;
            openFileInObsidian(plugin, targetFileName, lineNumber + 1, lineCount)
        }
    });
} 

// this is primarily used by the context menu for doing copy/push actions
export async function copyOrPushLineOrSelectionToNewLocationUsingCurrentCursorLocationAndBoomark(plugin: ThePlugin, copySelection: boolean, bookmarkText: string, evt?: MouseEvent | KeyboardEvent): Promise<void> {
    const bookmarkInfo = await parseBookmarkForItsElements(plugin, bookmarkText, false);
    if(bookmarkInfo.errorNumber===1)
        new Notice("Location in the bookmark does not exist.");
    else if(bookmarkInfo.errorNumber===2)
        new Notice("File as defined in the bookmark does not exist.");
    else {
        const activeEditor = getActiveView(plugin).editor;    
        const currentLine = activeEditor.getCursor().line;
        let textSelection = activeEditor.getSelection();
        if (textSelection === "") textSelection = activeEditor.getLine(currentLine); //get text from current line
        copyOrPushLineOrSelectionToNewLocation(plugin, copySelection, textSelection, bookmarkInfo.fileName,bookmarkInfo.fileLineNumber,bookmarkInfo.fileBookmarkContentsArray);
        if (evt && (evt.ctrlKey || evt.metaKey)) {
            const linesSelected = textSelection.split("\n").length;
            const lineCount = linesSelected > 1 ? linesSelected - 1 : 0;
            openFileInObsidian(plugin, bookmarkInfo.fileName, bookmarkInfo.fileLineNumber + 1, lineCount)
        }
    }
}

//Copies current file to clipbaord as a link or sends it to another file
export async function copyCurrentFileNameAsLinkToNewLocation(plugin: ThePlugin, copyToCliboard: boolean): Promise<void> {
    const fileLink= "[[" + getUniqueLinkPath( getActiveView(plugin).file.path ) + "]]"
    if(copyToCliboard) {
        navigator.clipboard.writeText(fileLink).then(text => text);
        new Notice(`${fileLink}\n\n Copied to the clipboard.`)
    } else
        copyOrPushLineOrSelectionToNewLocationWithFileLineSuggester(plugin, true, fileLink);
}

//copy a block reference of the current line to another file
export async function pushBlockReferenceToAnotherFile(plugin: ThePlugin): Promise<void> {
    await displayFileLineSuggester(plugin, false, true, false,  async (targetFileName, fileContentsArray, startLine, endLineNumber, evtFileSelected, evtFirstLine) => {
        if (startLine === -1) { //go to top of file, but test for YAML
            const f = new FileCacheAnalyzer(plugin, targetFileName);
            if (f.details.length > 0 && f.details[0].type === "yaml")
                startLine = f.details[0].lineEnd;
        }
        const results = await addBlockRefsToSelection(plugin, false);
        let blockRefs = "";
        const fileName = getActiveView(plugin).file.path;
        if (results.length > 0) {
            for (const ref of results)
                blockRefs += `![[${fileName}${ref}]]\n`;
            blockRefs = blockRefs.substring(0, blockRefs.length - 1);
            fileContentsArray.splice(Number(startLine) + 1, 0, { display: blockRefs, info: "" });
            let newContents = "";
            for (const line of fileContentsArray)
                newContents += line.display + "\n";
            newContents = newContents.substring(0, newContents.length - 1);
            plugin.app.vault.adapter.write(targetFileName, newContents);
            if ((evtFileSelected && (evtFileSelected.ctrlKey || evtFileSelected.metaKey)) || (evtFirstLine && (evtFirstLine.ctrlKey || evtFirstLine.metaKey))) {
                openFileInObsidian(plugin, targetFileName, startLine + 1)
            }
        }
    });
} 

// Pull (move) a line or lines from another file
export async function copyOrPulLineOrSelectionFromAnotherLocation(plugin: ThePlugin, copySelection: boolean): Promise<void> {
    await displayFileLineSuggester(plugin, true, false, true, async (targetFileName, fileContentsArray, startLine, endLine, evtFileSelected, evtFirstLine, evetLastLine) => {
        const ctrlKey = (evtFileSelected && evtFileSelected.ctrlKey) || (evtFirstLine && evtFirstLine.ctrlKey) || (evetLastLine && evetLastLine.ctrlKey);
        startLine = startLine === -1 ? startLine = 0 : startLine;
        endLine = endLine === -1 ? endLine = 0 : endLine;
        let stringToInsertIntoSelection = "";
        for (const element of fileContentsArray.slice(startLine, endLine + 1))
            stringToInsertIntoSelection += element.display + "\n";
        stringToInsertIntoSelection = stringToInsertIntoSelection.substring(0, stringToInsertIntoSelection.length - 1);
        getActiveView(plugin).editor.replaceSelection(stringToInsertIntoSelection);
        if (copySelection === false) {
            //pull selection, which means deleting what was just copied from original file
            fileContentsArray.splice(startLine, (endLine + 1) - startLine);
            let newContents = "";
            for (const line of fileContentsArray)
                newContents += line.display + "\n";
            newContents = newContents.substring(0, newContents.length - 1);
            await plugin.app.vault.adapter.write(targetFileName, newContents);
            if (ctrlKey) await openFileInObsidian(plugin, targetFileName, startLine);
        } else
            if (ctrlKey) await openFileInObsidian(plugin, targetFileName, startLine, endLine - startLine);
    });
}

// pull a block reference from another file and insert into the current location
export async function pullBlockReferenceFromAnotherFile(plugin: ThePlugin): Promise<void> {
    await displayFileLineSuggester(plugin, true, false, true, async (targetFileName, fileContentsArray, startLine, endLine, evtFileSelected, evtFirstLine, evetLastLine) => {
        startLine = startLine === -1 ? startLine = 0 : startLine;
        endLine = endLine === -1 ? endLine = 0 : endLine;
        const f = new FileCacheAnalyzer(plugin, targetFileName);
        const fileContents = (await plugin.app.vault.adapter.read(targetFileName)).split("\n");
        let fileChanged = false;
        const blockRefs = [];
        for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
            for (let sectionCounter = 0; sectionCounter < f.details.length; sectionCounter++) {
                const section = f.details[sectionCounter];
                if (lineNumber >= section.position.start.line && lineNumber <= section.position.end.line) {
                    if ((section.type === "paragraph" || section.type === "list") && !section.blockId) {
                        const newId = generateBlockId();
                        fileContents.splice(section.position.end.line, 1, fileContents[section.position.end.line] + " ^" + newId);
                        blockRefs.push("#^" + newId);
                        fileChanged = true;
                        lineNumber = section.position.end.line;
                        break;
                    } else if (section.type === "paragraph" || section.type === "list") {
                        blockRefs.push("#^" + section.blockId);
                        lineNumber = section.position.end.line;
                        break;
                    } else if (section.type === "heading") {
                        const heading = cleanupHeaderNameForBlockReference(section.headingText);
                        blockRefs.push("#" + heading);
                        lineNumber = section.position.end.line;
                        break;
                    }
                }
            } //sectionCounter
        } //lineNumber
        // Save new block refs to target file
        if (fileChanged === true) {
            let newContents = "";
            for (const line of fileContents)
                newContents += line + "\n";
            newContents = newContents.substring(0, newContents.length - 1);
            await plugin.app.vault.adapter.write(targetFileName, newContents);
        }
        // insert the block refs in current cursor  location
        if (blockRefs.length > 0) {
            let blockRefTextToInsert = "";
            for (const ref of blockRefs)
                blockRefTextToInsert += `![[${targetFileName}${ref}]]\n`;
            blockRefTextToInsert = blockRefTextToInsert.substring(0, blockRefTextToInsert.length - 1);
            getActiveView(plugin).editor.replaceSelection(blockRefTextToInsert);
        }
        if (evtFileSelected.ctrlKey || evtFirstLine.ctrlKey || evetLastLine.ctrlKey) {
            openFileInObsidian(plugin, targetFileName, startLine, endLine - startLine);
        }
    });
} 

export function testIfCursorIsOnALink(plugin: ThePlugin): LinkCache {
    const activeView  = getActiveView(plugin);
    const activeEditor = activeView.editor;    
    const currentLine = activeEditor.getCursor().line;
    const cache = this.app.metadataCache.getFileCache(activeView.file);
    if (cache.links || cache.embeds || cache.headings) {
        const ch = activeEditor.getCursor().ch;
        let linkInfo: LinkCache = null;
        if (cache.links)
            linkInfo = cache.links.find((l: LinkCache) => l.position.start.line === currentLine && (ch >= l.position.start.col && ch <= l.position.end.col));
        if (!linkInfo && cache.embeds)
            linkInfo = cache.embeds.find((l: LinkCache) => l.position.start.line === currentLine && (ch >= l.position.start.col && ch <= l.position.end.col));
        return linkInfo ? linkInfo : null;
    } else
        return null;
}

export async function copyBlockReferenceToCurrentCusorLocation(plugin: ThePlugin, linkInfo: LinkCache, leaveAliasToFile: boolean): Promise<void> {
    const file: TFile = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(linkInfo.link), "/");
    let fileContents = await plugin.app.vault.read(file);
    const cache = new FileCacheAnalyzer(plugin, file.path);
    if (cache.details && linkInfo.link.includes("^")) { //blockref
        const blockRefId = linkInfo.link.substr(linkInfo.link.indexOf("^") + 1);
        const pos = cache.details.find((b: CacheDetails) => b.blockId === blockRefId).position;
        fileContents = fileContents.split("\n").slice(pos.start.line, pos.end.line + 1).join("\n");
        fileContents = fileContents.replace("^" + blockRefId, "");
    } else if (cache.details && linkInfo.link.contains("#")) {//header link
        const headerId = linkInfo.link.substr(linkInfo.link.indexOf("#") + 1);
        const pos = cache.getPositionOfHeaderAndItsChildren(headerId);
        fileContents = fileContents.split("\n").slice(pos.start.line, pos.end.line + 1).join("\n");
    }
    if (leaveAliasToFile) fileContents += " [[" + linkInfo.link + "|*]]";
        getActiveView(plugin).editor.replaceRange(fileContents, { line: linkInfo.position.start.line, ch: linkInfo.position.start.col }, { line: linkInfo.position.end.line, ch: linkInfo.position.end.col });
}
