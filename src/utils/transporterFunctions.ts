import { nanoid } from 'nanoid';
import { CachedMetadata, Editor, TFile, View, Notice, EditorSelection, EditorRange } from "obsidian";
import { json } from 'stream/consumers';

function getContextObjects() {
    const currentView: View = this.app.workspace.activeLeaf.view;
    const currentFile: TFile = currentView.file;
    const cache: CachedMetadata = this.app.metadataCache.getFileCache(currentFile)
    const editor: Editor = currentView.editor;
    const currentLine: number = Number(editor.getCursor().line);
    return { currentView, currentFile, cache, editor, currentLine };
}

// put all sections into groupings of sections under there headings.
// ctx is the context object from 
function groupifySections(ctx) {
    let headingIndex = 0;
    let currentHeadingLevel = 0;
    let grouping = 0;
    for (let i = 0; i < ctx.cache.sections.length; i++) {
        const sec = ctx.cache.sections[i];
        if (sec.type === "heading") {
            currentHeadingLevel = Number(ctx.cache.headings[headingIndex].level);
            // sec.hT = ctx.cache.headings[headingIndex].heading;
            headingIndex += 1;
            if (currentHeadingLevel === 1) grouping += 1;
        }

        sec.grp = grouping;
        sec.hL = currentHeadingLevel;
    }
    return ctx.cache.sections;
}

// Select the current line in the editor of activeLeaf
function selectCurrentLine() {
    const ctx = getContextObjects();
    ctx.editor.setSelection({ line: ctx.currentLine, ch: 0 }, { line: ctx.currentLine, ch: ctx.editor.getLine(ctx.editor.getCursor().line).length });
}

//get the current block information from the cache
function indentifyCurrentSection() {
    const ctx = getContextObjects();
    return ctx.cache.sections.find(section=>section.position.start.line<=ctx.currentLine && section.position.end.line>=ctx.currentLine );
}

// Select the current section in the editor of activeLeaf
function selectCurrentSection(directionUP: boolean = true) {
    const ctx = getContextObjects();
    const currentRange: EditorSelection[] = ctx.editor.listSelections();
    if (currentRange[0].anchor.line === currentRange[0].head.line &&
        (currentRange[0].head.ch !== ctx.editor.getSelection().length) || (currentRange[0].head.ch === 0 && currentRange[0].anchor.ch === 0) &&
        (ctx.editor.getRange( { line: ctx.currentLine, ch: ctx.editor.getLine(ctx.currentLine).length },  { line: ctx.currentLine, ch: 0 } ).length !== 0)) {
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
                    nextBlock = ctx.cache.sections[i+1];
                 } catch (e) {}
            }
            if (firstSelectedLine > ctx.cache.sections[i].position.end.line) 
                proceedingBlock = ctx.cache.sections[i];
        }
        if (proceedingBlock && directionUP) {
            ctx.editor.setSelection({ line: proceedingBlock.position.start.line, ch: 0 }, { line: currentBlock.position.end.line, ch: ctx.editor.getLine(currentBlock.position.end.line).length  });
            ctx.editor.scrollIntoView({ from: proceedingBlock.position.start, to: proceedingBlock.position.start });
        } else if (directionUP) {
            ctx.editor.setSelection({ line: 0, ch: 0 }, { line: lastSelectedLine, ch: ctx.editor.getLine(lastSelectedLine).length });
            ctx.editor.scrollIntoView({ from: {line: 0, ch:0 }, to:  {line: firstSelectedLine, ch:0 } });
        } else if (nextBlock && directionUP===false) {
            ctx.editor.setSelection( {line: firstSelectedLine, ch: 0 } ,  { line: nextBlock.position.end.line, ch: ctx.editor.getLine(nextBlock.position.end.line).length } );
            ctx.editor.scrollIntoView({ from: nextBlock.position.start, to: nextBlock.position.start });
        } else if (directionUP==false) {
            ctx.editor.setSelection( {line: firstSelectedLine, ch: 0 } ,  { line: 99999, ch: 9999 } );
            ctx.editor.scrollIntoView({ from: {line: firstSelectedLine, ch:0}, to: { line: 99999, ch: 9999 } });
        }
    }
}

// copy the block reference for the current cursor location into the clipboard
// if header, the header reference is copied into clipobard
// if it is a block of text, the last line in the block is assigned a reference ID and this is copied into the clipboard
function copyBlockRefToClipboard() {
    const ctx = getContextObjects();
console.log(   ctx.currentLine  )
    const lastLineOfBlock = ctx.cache.sections.find(section => {
        if (ctx.currentLine >= Number(section.position.start.line) && ctx.currentLine <= Number(section.position.end.line)) {
            return section.position.start;
        }
    });
    if (lastLineOfBlock) {
        if (lastLineOfBlock.type === "heading") {
            const headerText: string = ctx.editor.getRange({ line: ctx.currentLine, ch: 0 }, { line: ctx.currentLine, ch: 9999 })
            let block = `![[${ctx.currentFile.name + headerText}]]`.split("\n").join("");
            navigator.clipboard.writeText(block).then(text => text);
        } else {
            let id = lastLineOfBlock.id ? lastLineOfBlock.id : nanoid(6);
            let block = `![[${ctx.currentFile.name}#^${id}]]`.split("\n").join("");
            navigator.clipboard.writeText(block).then(text => text);
            if (!lastLineOfBlock.id)
                ctx.editor.replaceRange(`${ctx.editor.getSelection().split("\n").join("")} ^${id}`, { line: Number(lastLineOfBlock.position.end.line), ch: lastLineOfBlock.position.end.col }, { line: Number(lastLineOfBlock.position.end.line), ch: lastLineOfBlock.position.end.col });
        }
    } else
        new Notice("The current cursor location is not a heading or block of text.");
}; //copyBlockRefToClipboard

export { selectCurrentLine, copyBlockRefToClipboard, selectCurrentSection, indentifyCurrentSection};
