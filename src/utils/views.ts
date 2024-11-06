import { MarkdownView } from "obsidian";
import type TextTransporterPlugin from "../main";

export enum ViewType {
	source = 0,
	preview = 1,
	none = 2,
}

export function getActiveView(plugin: TextTransporterPlugin): MarkdownView {
	return plugin.app.workspace.getActiveViewOfType(MarkdownView);
}

export function getActiveViewType(plugin: TextTransporterPlugin): ViewType {
	const currentView = getActiveView(plugin);
	if (!currentView) return ViewType.none;
	if (currentView.getMode() === "source") return ViewType.source;
	if (currentView.getMode() === "preview") return ViewType.preview;
}
