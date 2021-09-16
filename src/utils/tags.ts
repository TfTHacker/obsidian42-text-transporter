import { CachedMetadata, App } from "obsidian";
import { listenerCount } from "process";
import ThePlugin from "../main";
import { fileCacheAnalyzer } from "./fileCacheAnalyzer";
import { convertFileIntoArray } from "./fileNavigator";


//convenience function
export function getAllTagsWithCounts(): string[] {
    //@ts-ignore
    return app.metadataCache.getTags()
}

export function getAllTagsJustTagNames(): string[] {
    //@ts-ignore
    return Object.keys(app.metadataCache.getTags()).sort((a,b)=> a.localeCompare(b))
}

export function locationsWhereTagIsUsed(findTag: string): string[] {
    // @ts-ignore
    const oApp: App = app;
    const results = [];
    for(const file of oApp.vault.getMarkdownFiles()) {
        const cache: CachedMetadata = oApp.metadataCache.getFileCache(file);
        if(cache.tags)
            for(const tag of cache.tags) 
                if(findTag === tag.tag)
                    results.push( { file: file.path, position: tag.position})
    }
    return results.sort((a,b)=> a.file.localeCompare(b.file))
}

export function filesWhereTagIsUsed(findTag: string): string[] {
    let filesList = [];
    for(const l of locationsWhereTagIsUsed(findTag))
        if(!filesList.includes(l["file"])) filesList.push(l["file"])
    return filesList;
}

export async function blocksWhereTagIsUsed(plugin: ThePlugin, findTag: string): Promise<string[]> {
    let blockInfo = [];
    for(const l of locationsWhereTagIsUsed(findTag)) {
        const f = new fileCacheAnalyzer(plugin, l.file);
        const block = f.getBlockAtLine(l.position.start.line,true);
        if(block.type!=="yaml") {
            const taggedFileArray = await convertFileIntoArray(plugin, l.file)
            let blockText = ""
            for(const line of taggedFileArray.slice(block.lineStart, block.lineEnd+1))
                blockText += line.display + "\n";
            blockInfo.push({file: l.file, position: block.position, blockText: blockText.trim()})
        }        
    }   
    return blockInfo;
}