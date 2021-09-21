import { MarkdownView } from "obsidian"

export enum ViewType {
    source,
    preview, 
    none
}

export function getActiveViewType(): ViewType {
    // @ts-ignore
    const currentView: any = app.workspace.getActiveViewOfType(MarkdownView)
    if(!currentView)
        return ViewType.none
    else if(currentView.getMode()=="source")
        return ViewType.source;
    else if(currentView.getMode()=="preview")
        return ViewType.preview
}

