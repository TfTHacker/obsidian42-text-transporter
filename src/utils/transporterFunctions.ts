import { customAlphabet } from 'nanoid';
import { CachedMetadata, Editor, TFile, View, Notice, EditorSelection, SectionCache, EditorPosition } from "obsidian";
import { genericFuzzySuggester } from '../ui/genericFuzzySuggester';
import ThePlugin from '../main';
import { suggesterItem } from '../ui/genericFuzzySuggester';
import { fileCacheAnalyzer, cacheDetails } from './fileCacheAnalyzer';

function getContextObjects() {
    const currentView: View = this.app.workspace.activeLeaf.view;
    const currentFile: TFile = currentView.file;
    const cache: CachedMetadata = this.app.metadataCache.getFileCache(currentFile)
    const editor: Editor = currentView.editor;
    const currentLine = Number(editor.getCursor().line);
    let currentLineEmpty: boolean = editor.getLine(currentLine).trim().length === 0 ? true : false;
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
    const f = new fileCacheAnalyzer(plugin, ctx.currentFile.name);
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
    const f = new fileCacheAnalyzer(plugin, ctx.currentFile.name);
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
                console.log(value)
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
                if (ctx.currentLine >=  f.details[i].position.end.line) {
                    currentBlock =  f.details[i];
                    try {
                        nextBlock =  f.details[i + 1];
                    } catch (e) { console.log(e) }
                }
                if (firstSelectedLine >  f.details[i].position.end.line)
                    proceedingBlock =  f.details[i];
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

function cleanupHeaderNameForBlockReference(header:string): string {
    return header.replaceAll("[", "").replaceAll("]", "").replaceAll("#", "").replaceAll("|", "");
}

// copy the block reference for the current cursor location into the clipboard
// if header, the header reference is copied into clipobard
// if it is a block of text, the last line in the block is assigned a reference ID and this is copied into the clipboard
// copyAsAlias = true = make an aliased block ref
async function copyBlockRefToClipboard(plugin: ThePlugin, copyToClipBoard = true, copyAsAlias = false, aliasText = "*"): Promise<string> {
    const ctx = getContextObjects();
    const f = new fileCacheAnalyzer(plugin, ctx.currentFile.name);
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
    const f = new fileCacheAnalyzer(plugin, ctx.currentFile.name);
    const curSels = ctx.editor.listSelections();
    let blockRefs = [];
    for (const sel of curSels) {
        const startLine = sel.anchor.line > sel.head.line ? sel.head.line : sel.anchor.line;
        const endLine = sel.anchor.line > sel.head.line ? sel.anchor.line : sel.head.line;
        for (let selectedLineInEditor = startLine; selectedLineInEditor <= endLine; selectedLineInEditor++) {
            for (let sectionCounter = 0; sectionCounter < f.details.length; sectionCounter++) {
                const section = f.details[sectionCounter];
                if (selectedLineInEditor >= section.position.start.line && selectedLineInEditor <= section.position.end.line) {
                    if ( (section.type === "paragraph" || section.type === "list") && !section.blockId) {
                        const newId = nanoid();
                        ctx.editor.replaceRange(` ^${newId}`, { line: Number(section.position.end.line), ch: section.position.end.col }, { line: Number(section.position.end.line), ch: section.position.end.col });
                        blockRefs.push("#^" + newId);
                        selectedLineInEditor = section.position.end.line;
                        break;
                    } else if (section.type === "paragraph" || section.type === "list" ) {
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

    if(copyToClipbard && blockRefs.length>0) {
        let block = "";
        blockRefs.forEach( b => block+=`![[${ctx.currentFile.name}${b}]]\n`);
        navigator.clipboard.writeText(block).then(text => text);
    }

    

    return blockRefs;
} //addBlockRefsToSelection()

// displays a file selection  suggester,  then the contents of the file, then calls the callback  with:
// Callback function  will receive: Path+FileName, file contents as an array and line choosen
// if returnEndPoint = true, another suggester is shown so user can select endpoint of selection from file
async function displayFileLineSuggester(plugin: ThePlugin, returnEndPoint: boolean, callback): Promise<void> {
    const chooser = new genericFuzzySuggester(plugin);
    chooser.setSuggesterData(await plugin.fs.getAllFiles("/"));
    chooser.setPlaceholder("Select a file")

    await chooser.display(async (i: suggesterItem) => {
        // @ts-ignore
        const targetFileName = i.item.display;
        const curContent = await plugin.app.vault.adapter.read(targetFileName);
        const fileContentsArray: Array<suggesterItem> = [];

        for (const [key, value] of Object.entries(curContent.split('\n')))
            fileContentsArray.push({ display: value, info: key });

        const firstLinechooser = new genericFuzzySuggester(plugin);
        firstLinechooser.setSuggesterData(fileContentsArray);
        firstLinechooser.setPlaceholder("Select the line from file")

        await firstLinechooser.display(async (iFileLocation: suggesterItem, evt: MouseEvent | KeyboardEvent) => {
            if (returnEndPoint) { //if expecting endpoint, show suggester again
                if (Number(iFileLocation.item.info) === fileContentsArray.length - 1) {
                    //only one element in file, or selection is end of file
                    callback(targetFileName, fileContentsArray, Number(iFileLocation.item.info), Number(iFileLocation.item.info), evt);
                } else {
                    const endPointArray = fileContentsArray.slice(Number(iFileLocation.item.info));
                    const lastLineChooser = new genericFuzzySuggester(plugin);
                    lastLineChooser.setSuggesterData(endPointArray);
                    lastLineChooser.setPlaceholder("Select the last line for the selection")
                    await lastLineChooser.display(async (iFileLocationEndPoint: suggesterItem, evt: MouseEvent | KeyboardEvent) => {
                        callback(targetFileName, fileContentsArray, Number(iFileLocation.item.info), Number(iFileLocationEndPoint.item.info), evt);
                    });
                }
            } else
                callback(targetFileName, fileContentsArray, Number(iFileLocation.item.info), evt);
        });
    });
} //displayFileLineSuggester


// Copies or pushes (transfers) the current line or selection to another file
// copySelection = true for copy, false for move
async function copyOrPushLineOrSelectionToNewLocation(plugin: ThePlugin, copySelection: boolean): Promise<void> {
    const ctx = getContextObjects();
    let selectedText = ctx.editor.getSelection();
    if (selectedText === "") selectedText = ctx.editor.getLine(ctx.currentLine); //get text from current line
    await displayFileLineSuggester(plugin, false, (targetFileName, fileContentsArray, lineNumber) => {
        // @ts-ignore
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
    await displayFileLineSuggester(plugin, true, (targetFileName, fileContentsArray, startLine, endLine) => {
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
    await displayFileLineSuggester(plugin, false, async (targetFileName, fileContentsArray, startLine) => {
        const results = await addBlockRefsToSelection(plugin,false);
        let blockRefs = "";
        const fileName = getContextObjects().currentFile.path;
        if (results.length > 0) {
            for (let ref of results)
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
    await displayFileLineSuggester(plugin, true, async (targetFileName, fileContentsArray, startLine, endLine) => {
        const f = new fileCacheAnalyzer(plugin, targetFileName);
        let fileContents = (await plugin.app.vault.adapter.read(targetFileName)).split("\n");
        let fileChanged = false;
        let blockRefs = [];
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
                        const heading =  cleanupHeaderNameForBlockReference(section.headingText);
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

export {
    getContextObjects, selectAdjacentBlock,
    selectCurrentLine, copyBlockRefToClipboard, selectCurrentSection,
    indentifyCurrentSection, copyOrPushLineOrSelectionToNewLocation,
    copyOrPulLineOrSelectionFromAnotherLocation, addBlockRefsToSelection,
    pushBlockReferenceToAnotherFile, pullBlockReferenceFromAnotherFile
}
