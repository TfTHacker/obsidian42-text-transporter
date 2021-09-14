import { CachedMetadata, Editor, TFile, View, Notice, LinkCache, getLinkpath } from "obsidian";
import ThePlugin from '../main';
import { fileCacheAnalyzer, cacheDetails } from './fileCacheAnalyzer';
import { displayFileLineSuggester, openFileInObsidian } from "./fileNavigator";
import { generateBlockId } from "./blockId";

function getContextObjects(): any {
    const currentView: View = this.app.workspace.activeLeaf.view;
    let cache: CachedMetadata = null;
    let currentFile: TFile = null;
    let editor: Editor = null;
    let currentLine = null;
    let currentLineEmpty: boolean = null;
    if (this.app.workspace.activeLeaf.getViewState().type !== "empty") {
        currentFile = currentView.file;
        cache = this.app.metadataCache.getFileCache(currentFile);
        editor = currentView.editor;
        currentLine = Number(editor.getCursor().line);
        currentLineEmpty = editor.getLine(currentLine).trim().length === 0 ? true : false;
    }
    return { currentView, currentFile, cache, editor, currentLine, currentLineEmpty };
}

function cleanupHeaderNameForBlockReference(header: string): string {
    return header.replaceAll("[", "").replaceAll("]", "").replaceAll("#", "").replaceAll("|", "");
}

// copy the block reference for the current cursor location into the clipboard
// if header, the header reference is copied into clipobard
// if it is a block of text, the last line in the block is assigned a reference ID and this is copied into the clipboard
// copyAsAlias = true = make an aliased block ref
async function copyBlockRefToClipboard(plugin: ThePlugin, copyToClipBoard = true, copyAsAlias = false, aliasText = "*"): Promise<string> {
    const ctx = getContextObjects();
    const f = new fileCacheAnalyzer(plugin, ctx.currentFile.path);
    const currentBlock = f.getBlockAtLine(ctx.currentLine, true);

    const blockPrefix = copyAsAlias === false ? "!" : ""; //if alias, don't do embed preview
    aliasText = copyAsAlias === true ? "|" + aliasText : "";

    if (currentBlock.type === "heading") {
        let headerText: string = ctx.editor.getRange({ line: ctx.currentLine, ch: 0 }, { line: ctx.currentLine, ch: ctx.editor.getLine(ctx.currentLine).length })
        headerText = currentBlock.headingText.replaceAll("[", "").replaceAll("]", "").replaceAll("#", "").replaceAll("|", "");
        headerText = "#" + cleanupHeaderNameForBlockReference(headerText);
        const block = `${blockPrefix}[[${ctx.currentFile.name + headerText.trim()}${aliasText}]]`.split("\n").join("");
        if (copyToClipBoard)
            navigator.clipboard.writeText(block).then(text => text);
        else
            return block;
    } else if (currentBlock.type === "paragraph" || currentBlock.type === "list") {
        const id = currentBlock.blockId ? currentBlock.blockId : generateBlockId();
        const block = `${blockPrefix}[[${ctx.currentFile.name}#^${id}${aliasText}]]`.split("\n").join("");
        if (!currentBlock.blockId)
            ctx.editor.replaceRange(` ^${id}`, { line: Number(currentBlock.position.end.line), ch: currentBlock.position.end.col }, { line: Number(currentBlock.position.end.line), ch: currentBlock.position.end.col });
        if (copyToClipBoard)
            navigator.clipboard.writeText(block).then(text => text);
        else
            return block;
    } else
        new Notice("A block reference cannot be generated for this line.")
} //copyBlockRefToClipboard

// loops through current selected text and adds block refs to each paragraph
// returns all block refs found in selection
async function addBlockRefsToSelection(plugin: ThePlugin, copyToClipbard: boolean): Promise<Array<string>> {
    const ctx = getContextObjects();
    const f = new fileCacheAnalyzer(plugin, ctx.currentFile.path);
    const curSels = ctx.editor.listSelections();
    const blockRefs = [];
    for (const sel of curSels) {
        const startLine = sel.anchor.line > sel.head.line ? sel.head.line : sel.anchor.line;
        const endLine = sel.anchor.line > sel.head.line ? sel.anchor.line : sel.head.line;
        for (let selectedLineInEditor = startLine; selectedLineInEditor <= endLine; selectedLineInEditor++) {
            for (let sectionCounter = 0; sectionCounter < f.details.length; sectionCounter++) {
                const section = f.details[sectionCounter];
                if (selectedLineInEditor >= section.position.start.line && selectedLineInEditor <= section.position.end.line) {
                    if ((section.type === "paragraph" || section.type === "list") && !section.blockId) {
                        const newId = generateBlockId();
                        ctx.editor.replaceRange(` ^${newId}`, { line: Number(section.position.end.line), ch: section.position.end.col }, { line: Number(section.position.end.line), ch: section.position.end.col });
                        blockRefs.push("#^" + newId);
                        selectedLineInEditor = section.position.end.line;
                        break;
                    } else if (section.type === "paragraph" || section.type === "list") {
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
        blockRefs.forEach(b => block += `![[${ctx.currentFile.name}${b}]]\n`);
        navigator.clipboard.writeText(block).then(text => text);
    }
    return blockRefs;
} //addBlockRefsToSelection()


// Copies or pushes (transfers) the current line or selection to another file
// copySelection = true for copy, false for move
// defaultSelectionText  (use this function to push text, without changes to local editor)
async function copyOrPushLineOrSelectionToNewLocation(plugin: ThePlugin, copySelection: boolean, defaultSelectionText = ""): Promise<void> {
    const ctx = defaultSelectionText === "" ? getContextObjects() : null;
    let selectedText = defaultSelectionText === "" ? ctx.editor.getSelection() : defaultSelectionText;
    if (selectedText === "") selectedText = ctx.editor.getLine(ctx.currentLine); //get text from current line
    await displayFileLineSuggester(plugin, false, true, false, (targetFileName, fileContentsArray, lineNumber, endLineNumber, evtFileSelected, evtFirstLine) => {
        if (lineNumber === -1) { //go to top of file, but test for YAML
            const f = new fileCacheAnalyzer(plugin, targetFileName);
            if (f.details.length > 0 && f.details[0].type === "yaml")
                lineNumber = f.details[0].lineEnd;
        }
        fileContentsArray.splice(Number(lineNumber) + 1, 0, { display: selectedText, info: "" });
        let newContents = "";
        for (const line of fileContentsArray)
            newContents += line.display + "\n";
        newContents = newContents.substring(0, newContents.length - 1);
        plugin.app.vault.adapter.write(targetFileName, newContents);
        if (copySelection === false) {//this  is  a move, so delete the selection
            const textSelection = ctx.editor.getSelection();
            if (textSelection === "" || ctx.editor.getLine(ctx.currentLine).length === textSelection.length)
                ctx.editor.replaceRange("", { line: ctx.currentLine, ch: 0 }, { line: ctx.currentLine + 1, ch: 0 })
            else
                ctx.editor.replaceSelection(""); //replace whatever is the  selection
        }
        if ((evtFileSelected && (evtFileSelected.ctrlKey || evtFileSelected.metaKey)) || (evtFirstLine && (evtFirstLine.ctrlKey || evtFirstLine.metaKey))) {
            const linesSelected = selectedText.split("\n").length;
            const lineCount = linesSelected > 1 ? linesSelected - 1 : 0;
            openFileInObsidian(plugin, targetFileName, lineNumber + 1, lineCount)
        }
    });
} //copyOrPushLineOrSelectionToNewLocation

//copy a block reference of the current line to another file
async function pushBlockReferenceToAnotherFile(plugin: ThePlugin): Promise<void> {
    await displayFileLineSuggester(plugin, false, true, false, async (targetFileName, fileContentsArray, startLine, endLineNumber, evtFileSelected, evtFirstLine) => {
        if (startLine === -1) { //go to top of file, but test for YAML
            const f = new fileCacheAnalyzer(plugin, targetFileName);
            if (f.details.length > 0 && f.details[0].type === "yaml")
                startLine = f.details[0].lineEnd;
        }
        const results = await addBlockRefsToSelection(plugin, false);
        let blockRefs = "";
        const fileName = getContextObjects().currentFile.path;
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
} //pushBlockReferenceToAnotherFile

// Pull (move) a line or lines from another file
async function copyOrPulLineOrSelectionFromAnotherLocation(plugin: ThePlugin, copySelection: boolean): Promise<void> {
    await displayFileLineSuggester(plugin, true, false, true, async (targetFileName, fileContentsArray, startLine, endLine, evtFileSelected, evtFirstLine, evetLastLine) => {
        startLine = startLine === -1 ? startLine = 0 : startLine;
        endLine = endLine === -1 ? endLine = 0 : endLine;
        let stringToInsertIntoSelection = "";
        for (const element of fileContentsArray.slice(startLine, endLine + 1))
            stringToInsertIntoSelection += element.display + "\n";
        const ctx = getContextObjects();
        stringToInsertIntoSelection = stringToInsertIntoSelection.substring(0, stringToInsertIntoSelection.length - 1);
        ctx.editor.replaceSelection(stringToInsertIntoSelection);
        if (copySelection === false) {
            //pull selection, which means deleting what was just copied from original file
            fileContentsArray.splice(startLine, (endLine + 1) - startLine);
            let newContents = "";
            for (const line of fileContentsArray)
                newContents += line.display + "\n";
            newContents = newContents.substring(0, newContents.length - 1);
            await plugin.app.vault.adapter.write(targetFileName, newContents);
            if (evtFileSelected.ctrlKey || evtFirstLine.ctrlKey || evetLastLine.ctrlKey) await openFileInObsidian(plugin, targetFileName, startLine);
        } else
            if (evtFileSelected.ctrlKey || evtFirstLine.ctrlKey || evetLastLine.ctrlKey) await openFileInObsidian(plugin, targetFileName, startLine, endLine - startLine);
    });
} //copyOrPulLineOrSelectionFromAnotherLocation

// pull a block reference from another file and insert into the current location
async function pullBlockReferenceFromAnotherFile(plugin: ThePlugin): Promise<void> {
    await displayFileLineSuggester(plugin, true, false, true, async (targetFileName, fileContentsArray, startLine, endLine, evtFileSelected, evtFirstLine, evetLastLine) => {
        startLine = startLine === -1 ? startLine = 0 : startLine;
        endLine = endLine === -1 ? endLine = 0 : endLine;
        const f = new fileCacheAnalyzer(plugin, targetFileName);
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
            const ctx = getContextObjects()
            let blockRefTextToInsert = "";
            for (const ref of blockRefs)
                blockRefTextToInsert += `![[${targetFileName}${ref}]]\n`;
            blockRefTextToInsert = blockRefTextToInsert.substring(0, blockRefTextToInsert.length - 1);
            ctx.editor.replaceSelection(blockRefTextToInsert);
        }
        if (evtFileSelected.ctrlKey || evtFirstLine.ctrlKey || evetLastLine.ctrlKey) {
            openFileInObsidian(plugin, targetFileName, startLine, endLine - startLine);
        }
    });
} //pullBlockReferenceFromAnotherFile

function testIfCursorIsOnALink(): LinkCache {
    const ctx = getContextObjects();
    if (ctx.cache.links || ctx.cache.embeds || ctx.cache.headings) {
        const ch = ctx.editor.getCursor().ch;
        let linkInfo: LinkCache = null;
        if (ctx.cache.links)
            linkInfo = ctx.cache.links.find((l: LinkCache) => l.position.start.line === ctx.currentLine && (ch >= l.position.start.col && ch <= l.position.end.col));
        if (!linkInfo && ctx.cache.embeds)
            linkInfo = ctx.cache.embeds.find((l: LinkCache) => l.position.start.line === ctx.currentLine && (ch >= l.position.start.col && ch <= l.position.end.col));
        return linkInfo ? linkInfo : null;
    } else
        return null;
}

async function copyBlockReferenceToCurrentCusorLocation(plugin: ThePlugin, linkInfo: LinkCache, leaveAliasToFile: boolean): Promise<void> {
    const ctx = getContextObjects();
    const file: TFile = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(linkInfo.link), "/");
    let fileContents = await plugin.app.vault.read(file);
    const cache = new fileCacheAnalyzer(plugin, file.path);
    if (cache.details && linkInfo.link.includes("^")) { //blockref
        const blockRefId = linkInfo.link.substr(linkInfo.link.indexOf("^") + 1);
        const pos = cache.details.find((b: cacheDetails) => b.blockId === blockRefId).position;
        fileContents = fileContents.split("\n").slice(pos.start.line, pos.end.line + 1).join("\n");
        fileContents = fileContents.replace("^" + blockRefId, "");
    } else if (cache.details && linkInfo.link.contains("#")) {//header link
        const headerId = linkInfo.link.substr(linkInfo.link.indexOf("#") + 1);
        const pos = cache.getPositionOfHeaderAndItsChildren(headerId);
        fileContents = fileContents.split("\n").slice(pos.start.line, pos.end.line + 1).join("\n");
    }
    if (leaveAliasToFile) fileContents += " [[" + linkInfo.link + "|*]]";
    ctx.editor.replaceRange(fileContents, { line: linkInfo.position.start.line, ch: linkInfo.position.start.col }, { line: linkInfo.position.end.line, ch: linkInfo.position.end.col });
}

export {
    getContextObjects, copyBlockRefToClipboard,
    copyOrPushLineOrSelectionToNewLocation,
    copyOrPulLineOrSelectionFromAnotherLocation, addBlockRefsToSelection,
    pushBlockReferenceToAnotherFile, pullBlockReferenceFromAnotherFile,
    testIfCursorIsOnALink, copyBlockReferenceToCurrentCusorLocation,
    displayFileLineSuggester
}
