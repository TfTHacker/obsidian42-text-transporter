import { MarkdownView } from "obsidian"
import ThePlugin from '../main';

export enum ViewType {
    source,
    preview, 
    none
}

export function getActiveView(plugin: ThePlugin): MarkdownView {
    return plugin.app.workspace.getActiveViewOfType(MarkdownView);
}

export function getActiveViewType(plugin: ThePlugin): ViewType {
    const currentView = getActiveView(plugin);
    if(!currentView)
        return ViewType.none
    else if(currentView.getMode()=="source")
        return ViewType.source;
    else if(currentView.getMode()=="preview")
        return ViewType.preview
}

