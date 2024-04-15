import { CachedMetadata, Pos, SectionCache, CacheItem, HeadingCache, TFile, Loc } from 'obsidian';
import ThePlugin from '../main';

export interface CacheDetails {
  index: number;
  type: string;
  lineStart: number; // helper value, make it easier to loop through this object.
  lineEnd: number; // helper value, make it easier to loop through this object
  position: Pos;
  blockId?: string; // if a block id is assigned, this will have a value
  headingText?: string;
  headingLevel?: number;
}

export class FileCacheAnalyzer {
  cache: CachedMetadata;
  details: Array<CacheDetails> = [];
  plugin: ThePlugin;
  fileFullPath: string;

  constructor(plugin: ThePlugin, fileFullPath: string) {
    this.plugin = plugin;
    this.cache = <CachedMetadata>plugin.app.metadataCache.getCache(fileFullPath);
    this.fileFullPath = fileFullPath;

    if (this.cache.sections) {
      for (const section of this.cache.sections) {
        switch (section.type) {
          case 'heading':
            this.breakdownCacheItems(this.cache.headings, section, false);
            break;
          case 'list':
            this.breakdownCacheItems(this.cache.listItems, section, true);
            break;
          default:
            this.details.push({
              index: 0,
              type: section.type,
              lineStart: section.position.start.line,
              lineEnd: section.position.end.line,
              position: section.position,
              blockId: section.id
            });
            break;
        }
      }
      for (const i in this.details) this.details[i].index = Number(i);
    }
  }

  getBlockAtLine(line: number, defaultForward: boolean): CacheDetails {
    let lastBlockToMatch = this.details[0]; //default to 0 element
    for (let i = 0; i < this.details.length; i++) {
      const currentItem = this.details[i];
      if (defaultForward === false && line >= currentItem.lineEnd) lastBlockToMatch = currentItem;
      else if (defaultForward) {
        const nextItem = this.details[i + 1];
        if (line > currentItem.lineEnd && nextItem && line < nextItem.lineStart) lastBlockToMatch = nextItem;
        else if (line >= currentItem.lineStart) lastBlockToMatch = currentItem;
      }
    }
    return lastBlockToMatch;
  }

  getBlockAfterLine(line: number): CacheDetails {
    const blockIndexAtLine = this.getBlockAtLine(line, true).index;
    if (this.details.length === 1) return this.details[0];
    else if (this.details.length - 1 > blockIndexAtLine) return this.details[blockIndexAtLine + 1];
    else return null;
  }

  getBlockBeforeLine(line: number): CacheDetails {
    const blockNumberAtLine = this.getBlockAtLine(line, false).index;
    if (this.details.length === 0) return null;
    else if (blockNumberAtLine > 0 && this.details.length >= blockNumberAtLine) return this.details[blockNumberAtLine - 1];
    else return this.details[0];
  }

  getPositionOfHeaderAndItsChildren(headerName: string): Pos {
    let startLine: Loc = null;
    let endLine: Loc = null;
    let headingLevel = null;
    for (const h of this.details) {
      if (startLine === null && h.type === 'heading' && h.headingText === headerName) {
        startLine = h.position.start;
        headingLevel = h.headingLevel;
        endLine = h.position.end;
      } else if (startLine != null && h.type === 'heading' && h.headingLevel <= headingLevel) {
        break;
      } else endLine = h.position.end;
    }
    return startLine === null ? null : { start: startLine, end: endLine };
  }

  //debugging function: creats a doc with information
  async createDocumentWithInfo(): Promise<void> {
    let output = `# ${this.fileFullPath}\n\n`;
    for (const item of this.details) {
      output += item.type + ' ' + item.lineStart + '->' + item.lineEnd + ' ' + (item.blockId ? item.blockId : '') + '\n';
    }
    const fileName = '/fileBreadkown.md';
    await this.plugin.app.vault.adapter.write(fileName, output);
    const newFile = await this.plugin.app.vault.getAbstractFileByPath(fileName);
    const leaf = this.plugin.app.workspace.splitActiveLeaf('vertical');
    leaf.openFile(<TFile>newFile);
  }

  breakdownCacheItems(cacheItems: Array<CacheItem>, section: SectionCache, checkForBlockRefs: boolean): void {
    let itemsFoundTrackToBreakOut = false;
    for (const itemInCache of cacheItems) {
      const positionInSameRange = this.positionOfItemWithinSameRange(itemInCache.position, section.position);
      if (positionInSameRange === false && itemsFoundTrackToBreakOut === true) {
        break; // this looks funny but is for perf, but prevents the loop from continuing once matches have been found, but the item is no longer matched.
      } else if (positionInSameRange) {
        itemsFoundTrackToBreakOut = true; // will prevent the whole cacheItems from being looped once a match is found
        // section has a match in cache, so insert into details
        const itemToAppend: CacheDetails = {
          index: 0,
          type: section.type,
          lineStart: itemInCache.position.start.line,
          lineEnd: itemInCache.position.end.line,
          position: itemInCache.position
        };

        const heading = <HeadingCache>itemInCache;
        if (heading.heading) {
          //check if there is heading text
          itemToAppend.headingText = heading.heading;
          itemToAppend.headingLevel = heading.level;
        }

        if (checkForBlockRefs && this.cache.blocks) {
          // check for block references and insert them
          for (const b of Object.values(this.cache.blocks)) {
            if (this.positionOfItemWithinSameRange(b.position, itemInCache.position)) {
              itemToAppend.blockId = b.id;
              break;
            }
          }
        }
        this.details.push(itemToAppend);
      }
    } // cacheItems.forEach
  }

  // compares to Pos objects to see if they are in the same range
  positionOfItemWithinSameRange(firstPosition: Pos, secondPosition: Pos): boolean {
    return firstPosition.start.line >= secondPosition.start.line && firstPosition.end.line <= secondPosition.end.line;
  }
}
