import type { EditorPosition, EditorSelection, SectionCache } from "obsidian";
import type TextTransporterPlugin from "../main";
import {
	type CacheDetails,
	FileCacheAnalyzer,
} from "../utils/fileCacheAnalyzer";
import { getActiveView } from "../utils/views";

// Select the current line in the editor of activeLeaf
export function selectCurrentLine(plugin: TextTransporterPlugin): void {
	const activeView = getActiveView(plugin);
	const activeEditor = activeView.editor;
	const currentLine = activeEditor.getCursor().line;
	const selections = activeEditor.listSelections();
	if (selections.length === 1) {
		const sel: EditorSelection = selections[0];
		const lineLength = activeEditor.getLine(currentLine).length;
		if (
			sel.anchor.line === sel.head.line &&
			(sel.anchor.ch === lineLength || sel.head.ch === lineLength) &&
			activeEditor.getSelection().length > 0
		) {
			const f = new FileCacheAnalyzer(plugin, activeView.file.path);
			const block = f.getBlockAtLine(currentLine, true);
			activeEditor.setSelection(
				{ line: block.lineStart, ch: 0 },
				{ line: block.lineEnd, ch: block.position.end.col },
			);
		} else if (sel.anchor.line === sel.head.line)
			activeEditor.setSelection(
				{ line: currentLine, ch: 0 },
				{ line: currentLine, ch: activeEditor.getLine(currentLine).length },
			);
	}
}

// select the next block  or previous block.
// if nextBlock true - goto next, if false, go to previous
export function selectAdjacentBlock(
	plugin: TextTransporterPlugin,
	nextBlock: boolean,
): void {
	const activeView = getActiveView(plugin);
	const activeEditor = activeView.editor;
	const currentLine = activeEditor.getCursor().line;
	const currentLineEmpty =
		activeEditor.getLine(currentLine).trim().length === 0;
	const f = new FileCacheAnalyzer(plugin, activeView.file.path);
	let nextBlockSelection: CacheDetails;
	if (nextBlock)
		if (currentLineEmpty)
			nextBlockSelection = f.getBlockAtLine(currentLine, true); //nothing selected, go to nearst next block
		else nextBlockSelection = f.getBlockAfterLine(currentLine);
	else if (currentLineEmpty)
		nextBlockSelection = f.getBlockAtLine(currentLine, false); //nothing selected, go to nearst previous block
	else nextBlockSelection = f.getBlockBeforeLine(currentLine);
	if (nextBlockSelection !== null) {
		const start: EditorPosition = {
			line: nextBlockSelection.position.start.line,
			ch: nextBlockSelection.position.start.col,
		};
		const end: EditorPosition = {
			line: nextBlockSelection.position.end.line,
			ch: nextBlockSelection.position.end.col,
		};
		activeEditor.setSelection(start, end);
		activeEditor.scrollIntoView({ from: start, to: end });
	}
}

//get the current block information from the cache
export function indentifyCurrentSection(
	plugin: TextTransporterPlugin,
): SectionCache {
	const activeView = getActiveView(plugin);
	const activeEditor = activeView.editor;
	const currentLine = activeEditor.getCursor().line;
	const cache = this.app.metadataCache.getFileCache(activeView.file);
	return cache.sections.find(
		(section) =>
			section.position.start.line <= currentLine &&
			section.position.end.line >= currentLine,
	);
}

// Select the current section in the editor of activeLeaf and extend the selection in a given direction
export function selectCurrentSection(
	plugin: TextTransporterPlugin,
	directionUP = true,
): void {
	const activeView = getActiveView(plugin);
	const activeEditor = activeView.editor;
	const currentLine = activeEditor.getCursor().line;
	const cache = this.app.metadataCache.getFileCache(activeView.file);
	const f = new FileCacheAnalyzer(plugin, activeView.file.path);
	const currentRange: EditorSelection[] = activeEditor.listSelections();
	if (
		(currentRange[0].anchor.line === currentRange[0].head.line &&
			currentRange[0].head.ch !== activeEditor.getSelection().length) ||
		(currentRange[0].head.ch === 0 &&
			currentRange[0].anchor.ch === 0 &&
			activeEditor.getRange(
				{ line: currentLine, ch: activeEditor.getLine(currentLine).length },
				{ line: currentLine, ch: 0 },
			).length !== 0)
	) {
		// line not selected, so select the current line
		activeEditor.setSelection(
			{ line: currentLine, ch: 0 },
			{ line: currentLine, ch: activeEditor.getLine(currentLine).length },
		);
	} else {
		// test if this is a block, if it is, select it
		const lastLineOfBlock = f.details.find((section) => {
			if (
				currentLine >= Number(section.position.start.line) &&
				currentLine <= Number(section.position.end.line)
			) {
				return section.position.start;
			}
		});
		if (lastLineOfBlock === undefined) {
			// likely empty line is being triggered, nothing to select. so try to select the nearest block
			let nearestBlock = null;
			for (const value of Object.entries(f.details)) {
				if (value.position) {
					if (
						directionUP === false &&
						currentLine < Number(value.position.end.line) &&
						nearestBlock === null
					) {
						nearestBlock = value;
					} else if (
						directionUP === true &&
						currentLine > Number(value.position.start.line)
					) {
						nearestBlock = value;
					}
				}
			}
			if (nearestBlock === null && currentLine === 0 && f.details.length > 0)
				nearestBlock = cache.sections[0]; // first line, but no text to select, so select first  block
			if (nearestBlock !== null) {
				activeEditor.setSelection(
					{ line: nearestBlock.position.start.line, ch: 0 },
					{
						line: nearestBlock.position.end.line,
						ch: nearestBlock.position.end.col,
					},
				);
				return;
			}
		}
		const curSels = activeEditor.listSelections();
		if (
			lastLineOfBlock &&
			lastLineOfBlock.type === "paragraph" &&
			curSels.length === 1 &&
			curSels[0].anchor.line !== lastLineOfBlock.position.start.line &&
			curSels[0].head.line !== lastLineOfBlock.position.end.line
		) {
			// this clause is testing if the line is selected or some aspect of the block. if not a whole block selected, select the block
			activeEditor.setSelection(
				{ line: lastLineOfBlock.position.start.line, ch: 0 },
				{
					line: lastLineOfBlock.position.end.line,
					ch: lastLineOfBlock.position.end.col,
				},
			);
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
				if (currentLine >= f.details[i].position.end.line) {
					currentBlock = f.details[i];
					try {
						nextBlock = f.details[i + 1];
					} catch (e) {
						console.log(e);
					}
				}
				if (firstSelectedLine > f.details[i].position.end.line)
					proceedingBlock = f.details[i];
			}
			if (proceedingBlock && directionUP) {
				activeEditor.setSelection(
					{ line: proceedingBlock.position.start.line, ch: 0 },
					{
						line: currentBlock.position.end.line,
						ch: activeEditor.getLine(currentBlock.position.end.line).length,
					},
				);
				activeEditor.scrollIntoView({
					from: proceedingBlock.position.start,
					to: proceedingBlock.position.start,
				});
			} else if (directionUP) {
				activeEditor.setSelection(
					{ line: 0, ch: 0 },
					{
						line: lastSelectedLine,
						ch: activeEditor.getLine(lastSelectedLine).length,
					},
				);
				activeEditor.scrollIntoView({
					from: { line: 0, ch: 0 },
					to: { line: firstSelectedLine, ch: 0 },
				});
			} else if (nextBlock && directionUP === false) {
				activeEditor.setSelection(
					{ line: firstSelectedLine, ch: 0 },
					{
						line: nextBlock.position.end.line,
						ch: activeEditor.getLine(nextBlock.position.end.line).length,
					},
				);
				activeEditor.scrollIntoView({
					from: nextBlock.position.start,
					to: nextBlock.position.start,
				});
			}
		}
	}
}
