import { CachedMetadata, App, Pos } from "obsidian";
import ThePlugin from "../main";
import { FileCacheAnalyzer } from "./fileCacheAnalyzer";
import { convertFileIntoArray } from "./fileNavigatior";

interface TagLocation {
    tag: string;
    filePath: string;
    position: Pos;
}

//convenience function
export function getAllTagsWithCounts(): string[] {
    //@ts-ignore
    return app.metadataCache.getTags()
}

export function getAllTagsJustTagNames(): string[] {
    //@ts-ignore
    return Object.keys(app.metadataCache.getTags()).sort((a,b)=> a.localeCompare(b))
}

export function locationsWhereTagIsUsed(findTag: string): Array<TagLocation> {
    // @ts-ignore
    const oApp: App = app;
    const results = [];
    for(const file of oApp.vault.getMarkdownFiles()) {
        const cache: CachedMetadata = oApp.metadataCache.getFileCache(file);
        if(cache.tags)
            for(const tag of cache.tags) 
                if(findTag === tag.tag)
                    results.push( { tag:tag, filePath: file.path, position: tag.position})
    }
    return results.sort((a:TagLocation,b:TagLocation)=> a.filePath.localeCompare(b.filePath))
}

export function filesWhereTagIsUsed(findTag: string): string[] {
    const filesList = [];
    for(const l of locationsWhereTagIsUsed(findTag))
        if(!filesList.includes(l.filePath)) filesList.push(l.filePath)
    return filesList;
}

export async function blocksWhereTagIsUsed(plugin: ThePlugin, findTag: string): Promise<string[]> {
    const blockInfo = [];
    for(const l of locationsWhereTagIsUsed(findTag)) {
        const f = new FileCacheAnalyzer(plugin, l.filePath);
        const block = f.getBlockAtLine(l.position.start.line,true);
        if(block.type!=="yaml") {
            const taggedFileArray = await convertFileIntoArray(plugin, l.filePath)
            let blockText = ""
            for(const line of taggedFileArray.slice(block.lineStart, block.lineEnd+1))
                blockText += line.display + "\n";
            blockInfo.push({file: l.filePath, position: block.position, blockText: blockText.trim()})
        }        
    }   
    return blockInfo;
}