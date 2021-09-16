import { CachedMetadata, App } from "obsidian";


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