import { EditorSelection, SectionCache, EditorPosition } from "obsidian";
import ThePlugin from '../main';
import { FileCacheAnalyzer, CacheDetails } from './FileCacheAnalyzer';
import { getContextObjects } from "./transporterFunctions";

// Select the current line in the editor of activeLeaf
export function selectCurrentLine(plugin: ThePlugin): void {
    const ctx = getContextObjects();
    const selections = ctx.editor.listSelections();
    if(selections.length===1) {
        const sel: EditorSelection = selections[0];
        const lineLength = ctx.editor.getLine(ctx.editor.getCursor().line).length;
        if( (sel.anchor.line === sel.head.line) && (sel.anchor.ch===lineLength || sel.head.ch===lineLength) && ctx.editor.getSelection().length>0 ) {
            const f = new FileCacheAnalyzer(plugin, ctx.currentFile.path);
            const block = f.getBlockAtLine(ctx.currentLine, true);
            ctx.editor.setSelection( { line: block.lineStart, ch: 0}, { line: block.lineEnd, ch: block.position.end.col} );
        } else if (sel.anchor.line === sel.head.line)
            ctx.editor.setSelection({ line: ctx.currentLine, ch: 0 }, { line: ctx.currentLine, ch: ctx.editor.getLine(ctx.editor.getCursor().line).length });

    }
}

// select the next block  or previous block.
// if nextBlock true - goto next, if false, go to previous
export function selectAdjacentBlock(plugin: ThePlugin, nextBlock: boolean): void {
    const ctx = getContextObjects();
    const f = new FileCacheAnalyzer(plugin, ctx.currentFile.path);
    let nextBlockSelection: CacheDetails;
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
export function indentifyCurrentSection(): SectionCache {
    const ctx = getContextObjects();
    return ctx.cache.sections.find(section => section.position.start.line <= ctx.currentLine && section.position.end.line >= ctx.currentLine);
}

// Select the current section in the editor of activeLeaf and extend the selection in a given direction
export function selectCurrentSection(plugin: ThePlugin, directionUP = true): void {
    const ctx = getContextObjects();
    const f = new FileCacheAnalyzer(plugin, ctx.currentFile.path);
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

} 