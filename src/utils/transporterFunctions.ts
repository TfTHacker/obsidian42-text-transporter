import { customAlphabet } from 'nanoid';
import { CachedMetadata, Editor, TFile, View, Notice, EditorSelection, SectionCache } from "obsidian";
import { genericFuzzySuggester } from '../ui/genericFuzzySuggester';
import ThePlugin from '../main';
import { suggesterItem } from '../ui/genericFuzzySuggester';

function getContextObjects() {
    const currentView: View = this.app.workspace.activeLeaf.view;
    const currentFile: TFile = currentView.file;
    const cache: CachedMetadata = this.app.metadataCache.getFileCache(currentFile)
    const editor: Editor = currentView.editor;
    const currentLine = Number(editor.getCursor().line);
    return { currentView, currentFile, cache, editor, currentLine };
}

// put all sections into groupings of sections under there headings.
// ctx is the context object from 
// function groupifySections(ctx): void {
//     let headingIndex = 0;
//     let currentHeadingLevel = 0;
//     let grouping = 0;
//     for (let i = 0; i < ctx.cache.sections.length; i++) {
//         const sec = ctx.cache.sections[i];
//         if (sec.type === "heading") {
//             currentHeadingLevel = Number(ctx.cache.headings[headingIndex].level);
//             // sec.hT = ctx.cache.headings[headingIndex].heading;
//             headingIndex += 1;
//             if (currentHeadingLevel === 1) grouping += 1;
//         }

//         sec.grp = grouping;
//         sec.hL = currentHeadingLevel;
//     }
//     return ctx.cache.sections;
// }

// Select the current line in the editor of activeLeaf
function selectCurrentLine(): void {
    const ctx = getContextObjects();
    ctx.editor.setSelection({ line: ctx.currentLine, ch: 0 }, { line: ctx.currentLine, ch: ctx.editor.getLine(ctx.editor.getCursor().line).length });
}

//get the current block information from the cache
function indentifyCurrentSection(): SectionCache {
    const ctx = getContextObjects();
    return ctx.cache.sections.find(section => section.position.start.line <= ctx.currentLine && section.position.end.line >= ctx.currentLine);
}

// Select the current section in the editor of activeLeaf
function selectCurrentSection(directionUP = true): void {
    const ctx = getContextObjects();
    const currentRange: EditorSelection[] = ctx.editor.listSelections();
    if (currentRange[0].anchor.line === currentRange[0].head.line &&
        (currentRange[0].head.ch !== ctx.editor.getSelection().length) || (currentRange[0].head.ch === 0 && currentRange[0].anchor.ch === 0) &&
        (ctx.editor.getRange({ line: ctx.currentLine, ch: ctx.editor.getLine(ctx.currentLine).length }, { line: ctx.currentLine, ch: 0 }).length !== 0)) {
        ctx.editor.setSelection({ line: ctx.currentLine, ch: 0 }, { line: ctx.currentLine, ch: ctx.editor.getLine(ctx.currentLine).length });
    } else {
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
        for (let i = 0; i < ctx.cache.sections.length; i++) {
            if (lastSelectedLine >= ctx.cache.sections[i].position.start.line) {
                currentBlock = ctx.cache.sections[i];
                try {
                    nextBlock = ctx.cache.sections[i + 1];
                } catch (e) { console.log(e) }
            }
            if (firstSelectedLine > ctx.cache.sections[i].position.end.line)
                proceedingBlock = ctx.cache.sections[i];
        }
        if (proceedingBlock && directionUP) {
            ctx.editor.setSelection({ line: proceedingBlock.position.start.line, ch: 0 }, { line: currentBlock.position.end.line, ch: ctx.editor.getLine(currentBlock.position.end.line).length });
            ctx.editor.scrollIntoView({ from: proceedingBlock.position.start, to: proceedingBlock.position.start });
        } else if (directionUP) {
            ctx.editor.setSelection({ line: 0, ch: 0 }, { line: lastSelectedLine, ch: ctx.editor.getLine(lastSelectedLine).length });
            ctx.editor.scrollIntoView({ from: { line: 0, ch: 0 }, to: { line: firstSelectedLine, ch: 0 } });
        } else if (nextBlock && directionUP === false) {
            ctx.editor.setSelection({ line: firstSelectedLine, ch: 0 }, { line: nextBlock.position.end.line, ch: ctx.editor.getLine(nextBlock.position.end.line).length });
            ctx.editor.scrollIntoView({ from: nextBlock.position.start, to: nextBlock.position.start });
        } else if (directionUP == false) {
            ctx.editor.setSelection({ line: firstSelectedLine, ch: 0 }, { line: 99999, ch: 9999 });
            ctx.editor.scrollIntoView({ from: { line: firstSelectedLine, ch: 0 }, to: { line: 99999, ch: 9999 } });
        }
    }
}

// copy the block reference for the current cursor location into the clipboard
// if header, the header reference is copied into clipobard
// if it is a block of text, the last line in the block is assigned a reference ID and this is copied into the clipboard
function copyBlockRefToClipboard(): void {
    const ctx = getContextObjects();
    const lastLineOfBlock = ctx.cache.sections.find(section => {
        if (ctx.currentLine >= Number(section.position.start.line) && ctx.currentLine <= Number(section.position.end.line)) {
            return section.position.start;
        }
    });
    if (lastLineOfBlock) {
        if (lastLineOfBlock.type === "heading") {
            const headerText: string = ctx.editor.getRange({ line: ctx.currentLine, ch: 0 }, { line: ctx.currentLine, ch: ctx.editor.getLine(ctx.currentLine).length })
            const block = `![[${ctx.currentFile.name + headerText.trim()}]]`.split("\n").join("");
            navigator.clipboard.writeText(block).then(text => text);
        } else {
            const nanoid = customAlphabet('abcdefghijklmnopqrstuvwz', 6)
            const id = lastLineOfBlock.id ? lastLineOfBlock.id : nanoid();
            const block = `![[${ctx.currentFile.name}#^${id}]]`.split("\n").join("");
            navigator.clipboard.writeText(block).then(text => text);
            if (!lastLineOfBlock.id)
                ctx.editor.replaceRange(`${ctx.editor.getSelection().split("\n").join("")} ^${id}`, { line: Number(lastLineOfBlock.position.end.line), ch: lastLineOfBlock.position.end.col }, { line: Number(lastLineOfBlock.position.end.line), ch: lastLineOfBlock.position.end.col });
        }
    } else
        new Notice("The current cursor location is not a heading or block of text.");
} //copyBlockRefToClipboard

// displays a file selection  suggester,  then the contents of the file, then calls the callback  with:
// Callback function  will receive: Path+FileName, file contents as an array and line choosen
async function displayFileLineSuggester(plugin: ThePlugin, callback): Promise<void> {
    const chooser = new genericFuzzySuggester(plugin);
    chooser.setSuggesterData(await plugin.fs.getAllFiles("/"));

    await chooser.display(async (i: suggesterItem) => {
        // @ts-ignore
        const targetFileName = i.item.display;
        const curContent = await plugin.app.vault.adapter.read(targetFileName);
        const fileContentsArray: Array<suggesterItem> = [];

        for (const [key, value] of Object.entries(curContent.split('\n')))
            fileContentsArray.push({ display: value, info: key });

        chooser.setSuggesterData(fileContentsArray);

        await chooser.display(async (iFileLocation: suggesterItem, evt: MouseEvent | KeyboardEvent) => {
            // @ts-ignore
            callback(targetFileName, fileContentsArray, iFileLocation.item.info, evt);
        });

    });

}


// Copies the current line or selection to another file
// copySelection = true for copy, false for move
async function copyOrMoveLineOrSelectionToNewLocation(plugin: ThePlugin, copySelection: boolean): Promise<void> {
    const ctx = getContextObjects();
    let selectedText = ctx.editor.getSelection();
    if (selectedText === "") selectedText = ctx.editor.getLine(ctx.currentLine); //get text from current line
    await displayFileLineSuggester(plugin, (targetFileName, fileContentsArray, lineNumber) => {
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
    })
}




export { selectCurrentLine, copyBlockRefToClipboard, selectCurrentSection, indentifyCurrentSection, copyOrMoveLineOrSelectionToNewLocation }
