import { customAlphabet } from 'nanoid';
import { CachedMetadata, Editor, TFile, View, Notice, EditorSelection, SectionCache, EditorPosition, moment, LinkCache, getLinkpath } from "obsidian";
import { genericFuzzySuggester } from '../ui/genericFuzzySuggester';
import ThePlugin from '../main';
import { suggesterItem } from '../ui/genericFuzzySuggester';
import { fileCacheAnalyzer, cacheDetails } from './fileCacheAnalyzer';
import { createDailyNote, getAllDailyNotes, getDailyNote } from 'obsidian-daily-notes-interface';

function getContextObjects(): any {
    const currentView: View = this.app.workspace.activeLeaf.view;
    const currentFile: TFile = currentView.file;
    const cache: CachedMetadata = this.app.metadataCache.getFileCache(currentFile)
    const editor: Editor = currentView.editor;
    const currentLine = Number(editor.getCursor().line);
    const currentLineEmpty: boolean = editor.getLine(currentLine).trim().length === 0 ? true : false;
    return { currentView, currentFile, cache, editor, currentLine, currentLineEmpty };
}

// Select the current line in the editor of activeLeaf
function selectCurrentLine(): void {
    const ctx = getContextObjects();
    ctx.editor.setSelection({ line: ctx.currentLine, ch: 0 }, { line: ctx.currentLine, ch: ctx.editor.getLine(ctx.editor.getCursor().line).length });
}

// select the next block  or previous block.
// if nextBlock true - goto next, if false, go to previous
function selectAdjacentBlock(plugin: ThePlugin, nextBlock: boolean): void {
    const ctx = getContextObjects();
    const f = new fileCacheAnalyzer(plugin, ctx.currentFile.path);
    let nextBlockSelection: cacheDetails;
    if (nextBlock)
        if (ctx.currentLineEmpty)
            nextBlockSelection = f.getBlockAtLine(ctx.currentLine, true); //nothing selected, go to nearst next block
        else
            nextBlockSelection = f.getBlockAfterLine(ctx.currentLine);
    else
        if (ctx.currentLineEmpty)
            nextBlockSelection = f.getBlockAtLine(ctx.currentLine, false); //nothing selected, go to nearst previous block
        else
            nextBlockSelection = f.getBlockBeforeLine(ctx.currentLine);
    if (nextBlockSelection !== null) {
        const start: EditorPosition = { line: nextBlockSelection.position.start.line, ch: nextBlockSelection.position.start.col };
        const end: EditorPosition = { line: nextBlockSelection.position.end.line, ch: nextBlockSelection.position.end.col };
        ctx.editor.setSelection(start, end);
        ctx.editor.scrollIntoView({ from: start, to: end });
    }
}

//get the current block information from the cache
function indentifyCurrentSection(): SectionCache {
    const ctx = getContextObjects();
    return ctx.cache.sections.find(section => section.position.start.line <= ctx.currentLine && section.position.end.line >= ctx.currentLine);
}

// Select the current section in the editor of activeLeaf and extend the selection in a given direction
function selectCurrentSection(plugin: ThePlugin, directionUP = true): void {
    const ctx = getContextObjects();
    const f = new fileCacheAnalyzer(plugin, ctx.currentFile.path);
    const currentRange: EditorSelection[] = ctx.editor.listSelections();
    if (currentRange[0].anchor.line === currentRange[0].head.line &&
        (currentRange[0].head.ch !== ctx.editor.getSelection().length) || (currentRange[0].head.ch === 0 && currentRange[0].anchor.ch === 0) &&
        (ctx.editor.getRange({ line: ctx.currentLine, ch: ctx.editor.getLine(ctx.currentLine).length }, { line: ctx.currentLine, ch: 0 }).length !== 0)) {
        // line not selected, so select the current line
        ctx.editor.setSelection({ line: ctx.currentLine, ch: 0 }, { line: ctx.currentLine, ch: ctx.editor.getLine(ctx.currentLine).length });
    } else {
        // test if this is a block, if it is, select it
        const lastLineOfBlock = f.details.find(section => {
            if (ctx.currentLine >= Number(section.position.start.line) && ctx.currentLine <= Number(section.position.end.line)) {
                return section.position.start;
            }
        });
        if (lastLineOfBlock === undefined) { // likely empty line is being triggered, nothing to select. so try to select the nearest block
            let nearestBlock = null;
            for (const value of Object.entries(f.details)) {
                if (value.position) {
                    if (directionUP === false && ctx.currentLine < Number(value.position.end.line) && nearestBlock === null) {
                        nearestBlock = value;
                    } else if (directionUP === true && ctx.currentLine > Number(value.position.start.line)) {
                        nearestBlock = value;
                    }
                }
            }
            if (nearestBlock === null && ctx.currentLine === 0 && f.details.length > 0)
                nearestBlock = ctx.cache.sections[0]; // first line, but no text to select, so select first  block
            if (nearestBlock !== null) {
                ctx.editor.setSelection({ line: nearestBlock.position.start.line, ch: 0 }, { line: nearestBlock.position.end.line, ch: nearestBlock.position.end.col });
                return;
            }
        }
        const curSels = ctx.editor.listSelections();
        if (lastLineOfBlock && lastLineOfBlock.type === "paragraph" && curSels.length === 1 &&
            (curSels[0].anchor.line !== lastLineOfBlock.position.start.line && curSels[0].head.line !== lastLineOfBlock.position.end.line)) {
            // this clause is testing if the line is selected or some aspect of the block. if not a whole block selected, select the block
            ctx.editor.setSelection({ line: lastLineOfBlock.position.start.line, ch: 0 }, { line: lastLineOfBlock.position.end.line, ch: lastLineOfBlock.position.end.col });
        } else {
            // something is selected, so expand the selection
            let firstSelectedLine = 0;
            let lastSelectedLine = 0;
            let currentBlock = null;
            let proceedingBlock = null;
            let nextBlock = null;
            if (currentRange[0].anchor.line < currentRange[0].head.line) {
                firstSelectedLine = currentRange[0].anchor.line;
                lastSelectedLine = currentRange[0].head.line;
            } else {
                firstSelectedLine = currentRange[0].head.line;
                lastSelectedLine = currentRange[0].anchor.line;
            }
            for (let i = 0; i < f.details.length; i++) {
                if (ctx.currentLine >= f.details[i].position.end.line) {
                    currentBlock = f.details[i];
                    try {
                        nextBlock = f.details[i + 1];
                    } catch (e) { console.log(e) }
                }
                if (firstSelectedLine > f.details[i].position.end.line)
                    proceedingBlock = f.details[i];
            }
            if (proceedingBlock && directionUP) {
                ctx.editor.setSelection({ line: proceedingBlock.position.start.line, ch: 0 },
                    { line: currentBlock.position.end.line, ch: ctx.editor.getLine(currentBlock.position.end.line).length });
                ctx.editor.scrollIntoView({ from: proceedingBlock.position.start, to: proceedingBlock.position.start });
            } else if (directionUP) {
                ctx.editor.setSelection({ line: 0, ch: 0 }, { line: lastSelectedLine, ch: ctx.editor.getLine(lastSelectedLine).length });
                ctx.editor.scrollIntoView({ from: { line: 0, ch: 0 }, to: { line: firstSelectedLine, ch: 0 } });
            } else if (nextBlock && directionUP === false) {
                ctx.editor.setSelection({ line: firstSelectedLine, ch: 0 }, { line: nextBlock.position.end.line, ch: ctx.editor.getLine(nextBlock.position.end.line).length });
                ctx.editor.scrollIntoView({ from: nextBlock.position.start, to: nextBlock.position.start });
            }
        }

    }

} //selectCurrentSection

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwz', 6);

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
        const id = currentBlock.blockId ? currentBlock.blockId : nanoid();
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
                        const newId = nanoid();
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

// displays a file selection  suggester,  then the contents of the file, then calls the callback  with:
// Callback function  will receive: Path+FileName, file contents as an array and line choosen
// if returnEndPoint = true, another suggester is shown so user can select endpoint of selection from file
// show top will diplsay -- top at top of suggester
// pullTypeRequest - iff it is a pull type reqeust, this should be true, some commands might need different behavior if a pull
async function displayFileLineSuggester(plugin: ThePlugin, returnEndPoint: boolean, showTop: boolean, pullTypeRequest: boolean, callback): Promise<void> {
    const activeFile = getContextObjects().currentFile.path;
    const fileList: Array<suggesterItem> = await plugin.fs.getAllFiles("/");
    for (let i = 0; i < fileList.length; i++)
        if (fileList[i].info.localeCompare(activeFile, undefined, { sensitivity: 'base' }) === 0) {
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

    await chooser.display(async (i: suggesterItem, evt: MouseEvent | KeyboardEvent) => {
        const controlKeyUsed = evt.ctrlKey;
        let fileContentsStartingLine = 0;

        // @ts-ignore
        let targetFileName = i.info;

        if (plugin.settings.enableDNP && targetFileName === plugin.dnpHeaderForFileSelector) {
            let dnp = getDailyNote(moment(), getAllDailyNotes());
            if (dnp === null)
                dnp = await createDailyNote(moment());
            targetFileName = dnp.path;
        } else if (targetFileName.search(";") > 0) {
            // a bookmark was selected with a command. process callback
            let filePath = targetFileName.substring(0, targetFileName.search(";"));
            const command = targetFileName.substring(filePath.length + 1).toLocaleUpperCase().trim();
            if (filePath === "DNPTODAY") {
                let dnp = getDailyNote(moment(), getAllDailyNotes());
                if (dnp === null)
                    dnp = await createDailyNote(moment());
                filePath = dnp.path;
            } 
            
            let lineNumber = -1; //default for top
            const fileContentsArray: Array<suggesterItem> = [];
            for (const [key, value] of Object.entries((await plugin.app.vault.adapter.read(filePath)).split('\n'))) {
                fileContentsArray.push({ display: value, info: key });
            }
            if (command === "BOTTOM" || command !== "TOP") {
                if (command === "BOTTOM")
                    lineNumber = fileContentsArray.length - 1;
                else { // find location in file
                    for (let i = 0; i < fileContentsArray.length; i++) {
                        if (fileContentsArray[i].display.toLocaleUpperCase().trim() === command) {
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
            if (!controlKeyUsed) {
                callback(filePath, fileContentsArray, lineNumber, lineNumber);
                return;
            } else {  // use the bookmarked location as starting point for next step in commands
                fileContentsStartingLine = lineNumber;
                targetFileName = filePath;
                showTop = false;
            }
        }

        const curContent = await plugin.app.vault.adapter.read(targetFileName);
        const fileContentsArray: Array<suggesterItem> = [];

        for (const [key, value] of Object.entries(curContent.split('\n')))
            fileContentsArray.push({ display: value, info: key });

        if (showTop) fileContentsArray.unshift({ display: "-- Top of file --", info: -1 });

        const firstLinechooser = new genericFuzzySuggester(plugin);
        firstLinechooser.setPlaceholder("Select the line from file")
        if (fileContentsStartingLine > 0)
            firstLinechooser.setSuggesterData(fileContentsArray.slice(fileContentsStartingLine));
        else
            firstLinechooser.setSuggesterData(fileContentsArray);

        await firstLinechooser.display(async (iFileLocation: suggesterItem, evt: MouseEvent | KeyboardEvent) => {
            let startFilePosition = Number(iFileLocation.info);
            if (showTop) fileContentsArray.splice(0, 1); // remove "-- Top of File -- "
            if (returnEndPoint) { //if expecting endpoint, show suggester again
                if (startFilePosition === fileContentsArray.length - 1) {
                    //only one element in file, or selection is end of file
                    callback(targetFileName, fileContentsArray, startFilePosition, startFilePosition, evt);
                } else {
                    startFilePosition = startFilePosition === -1 ? 0 : startFilePosition;
                    const endPointArray = fileContentsArray.slice(startFilePosition);
                    const lastLineChooser = new genericFuzzySuggester(plugin);
                    lastLineChooser.setSuggesterData(endPointArray);
                    lastLineChooser.setPlaceholder("Select the last line for the selection")
                    await lastLineChooser.display(async (iFileLocationEndPoint: suggesterItem, evt: MouseEvent | KeyboardEvent) => {
                        callback(targetFileName, fileContentsArray, startFilePosition, Number(iFileLocationEndPoint.info), evt);
                    });
                }
            } else {
                callback(targetFileName, fileContentsArray, startFilePosition, evt);
            }
        });
    });
} //displayFileLineSuggester


// Copies or pushes (transfers) the current line or selection to another file
// copySelection = true for copy, false for move
// defaultSelectionText  (use this function to push text, without changes to local editor)
async function copyOrPushLineOrSelectionToNewLocation(plugin: ThePlugin, copySelection: boolean, defaultSelectionText = ""): Promise<void> {
    const ctx = getContextObjects();
    let selectedText = defaultSelectionText === "" ? ctx.editor.getSelection() : defaultSelectionText;
    if (selectedText === "") selectedText = ctx.editor.getLine(ctx.currentLine); //get text from current line
    await displayFileLineSuggester(plugin, false, true, false, (targetFileName, fileContentsArray, lineNumber) => {
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
    });
} //copyOrPushLineOrSelectionToNewLocation

// Pull (move) a line or lines from another file
async function copyOrPulLineOrSelectionFromAnotherLocation(plugin: ThePlugin, copySelection: boolean): Promise<void> {
    await displayFileLineSuggester(plugin, true, false, true, (targetFileName, fileContentsArray, startLine, endLine) => {
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
            plugin.app.vault.adapter.write(targetFileName, newContents);
        }
    });
} //copyOrPulLineOrSelectionFromAnotherLocation

//copy a block reference of the current line to another file
async function pushBlockReferenceToAnotherFile(plugin: ThePlugin): Promise<void> {
    await displayFileLineSuggester(plugin, false, true, false, async (targetFileName, fileContentsArray, startLine) => {
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
        }
    });
} //pushBlockReferenceToAnotherFile

// pull a block reference from another file and insert into the current location
async function pullBlockReferenceFromAnotherFile(plugin: ThePlugin): Promise<void> {
    await displayFileLineSuggester(plugin, true, false, true, async (targetFileName, fileContentsArray, startLine, endLine) => {
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
                        const newId = nanoid();
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
    getContextObjects, selectAdjacentBlock,
    selectCurrentLine, copyBlockRefToClipboard, selectCurrentSection,
    indentifyCurrentSection, copyOrPushLineOrSelectionToNewLocation,
    copyOrPulLineOrSelectionFromAnotherLocation, addBlockRefsToSelection,
    pushBlockReferenceToAnotherFile, pullBlockReferenceFromAnotherFile,
    testIfCursorIsOnALink, copyBlockReferenceToCurrentCusorLocation,
    displayFileLineSuggester
}
