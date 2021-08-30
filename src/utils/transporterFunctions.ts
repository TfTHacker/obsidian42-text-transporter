import { nanoid } from 'nanoid';
import { CachedMetadata, Editor, TFile, View, Notice } from "obsidian";

function getContextObjects() {
    const currentView: View = this.app.workspace.activeLeaf.view;
    const currentFile: TFile = currentView.file;
    const cache: CachedMetadata = this.app.metadataCache.getFileCache(currentFile)
    const editor: Editor = currentView.editor;
    const currentLine: number = Number(editor.getCursor().line);
    return { currentView, currentFile, cache, editor, currentLine };
}

// Select the current line in the editor of activeLeaf
function selectCurrentLine() {
    const ctx = getContextObjects();
    ctx.editor.setSelection({ line: ctx.currentLine, ch: 0 }, { line: ctx.currentLine, ch: 9999 });
}


// Select the current section in the editor of activeLeaf
function selectCurrentSection() {
    const ctx = getContextObjects();
    

}

// copy the block reference for the current cursor location into the clipboard
// if header, the header reference is copied into clipobard
// if it is a block of text, the last line in the block is assigned a reference ID and this is copied into the clipboard
function copyBlockRefToClipboard() {
    const ctx = getContextObjects();
    const lastLineOfBlock = ctx.cache.sections.find(section => {
        if (ctx.currentLine >= Number(section.position.start.line) && ctx.currentLine <= Number(section.position.end.line)) {
            return section;
        }
    });
    if (lastLineOfBlock) {
        console.log(lastLineOfBlock)
        if (lastLineOfBlock.type === "heading") {
            const headerText: string = ctx.editor.getRange({ line: ctx.currentLine, ch: 0 }, { line: ctx.currentLine, ch: 9999 })
            let block = `![[${ctx.currentFile.name + headerText}]]`.split("\n").join("");
            navigator.clipboard.writeText(block).then(text => text);
        } else {
            let id = lastLineOfBlock.id ? lastLineOfBlock.id : nanoid(6);
            let block = `![[${ctx.currentFile.name}#^${id}]]`.split("\n").join("");
            navigator.clipboard.writeText(block).then(text => text);
            if(!lastLineOfBlock.id) 
                ctx.editor.replaceRange(`${ctx.editor.getSelection().split("\n").join("")} ^${id}`, {line:Number(lastLineOfBlock.position.end.line), ch:lastLineOfBlock.position.end.col}, {line:Number(lastLineOfBlock.position.end.line), ch:9999});
        }
    } else
        new Notice("The current cursor location is not a heading or block of text.");
}; //copyBlockRefToClipboard

export { selectCurrentLine, copyBlockRefToClipboard };
