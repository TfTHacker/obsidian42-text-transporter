import { MarkdownView } from 'obsidian';
import TextTransporterPlugin from '../main';

export enum ViewType {
  source,
  preview,
  none
}

export function getActiveView(plugin: TextTransporterPlugin): MarkdownView {
  return plugin.app.workspace.getActiveViewOfType(MarkdownView);
}

export function getActiveViewType(plugin: TextTransporterPlugin): ViewType {
  const currentView = getActiveView(plugin);
  if (!currentView) return ViewType.none;
  else if (currentView.getMode() == 'source') return ViewType.source;
  else if (currentView.getMode() == 'preview') return ViewType.preview;
}
