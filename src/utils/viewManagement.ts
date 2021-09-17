import { MarkdownView } from "obsidian"

export enum viewType {
    source,
    preview, 
    none
}

export function getActiveViewType(): viewType {
    // @ts-ignore
    const currentView: any = app.workspace.getActiveViewOfType(MarkdownView)
    if(!currentView)
        return viewType.none
    else if(currentView.getMode()=="source")
        return viewType.source;
    else if(currentView.getMode()=="preview")
        return viewType.preview
}

