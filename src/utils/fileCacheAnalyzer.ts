import { CachedMetadata, Pos, SectionCache, CacheItem, BlockCache } from "obsidian";
import ThePlugin from "../main";
import { copyOrPushLineOrSelectionToNewLocation, selectCurrentLine } from "./transporterFunctions";

interface cacheDetails {
    type: string;
    lineStart: number;  // helper value, make it easier to loop through this object.
    lineEnd: number;    // helper value, make it easier to loop through this object
    position: Pos;
    blockId?: string;    // if a block id is assigned, this will have a value
    headingText?: string;
}


export default class fileCacheAnalyzer {
    cache: CachedMetadata;
    details: Array<cacheDetails> = [];
    plugin: ThePlugin;

    constructor(plugin: ThePlugin, fileFullPath: string) {
        console.clear()
        // console.log('filePath:' + fileFullPath);
        this.plugin = plugin;
        this.cache = plugin.app.metadataCache.getCache(fileFullPath)

        console.log('cache')
        console.log(this.cache)

        for (let section of this.cache.sections) {
            switch (section.type) {
                case "paragraph":
                    this.details.push({
                        type: section.type,
                        lineStart: section.position.start.line,
                        lineEnd: section.position.end.line,
                        position: section.position,
                        blockId: section.id
                    })
                    break;
                case "heading":
                    this.breakdownCacheItems(this.cache.headings, section, false);
                    break;
                case "list":
                    this.breakdownCacheItems(this.cache.listItems, section, true);
                    break;
            }
        }


        console.log('details')
        console.log(this.details)

    }

    breakdownCacheItems(cacheItems: Array<CacheItem>, section: SectionCache, checkForBlockRefs: boolean): void {
        let itemsFoundTrackToBreakOut = false;
        for(let itemInCache of cacheItems) {
            const positionInSameRange = this.positionOfItemWithinSameRange(itemInCache.position, section.position);
            if ( positionInSameRange === false && itemsFoundTrackToBreakOut===true ) {
                break; // this looks funny but is for perf, but prevents the loop from continuing once matches have been found, but the item is no longer matched.
            } else if (positionInSameRange )  {
                itemsFoundTrackToBreakOut = true; // will prevent the whole cacheItems from being looped once a match is found
                // section has a match in cache, so insert into details
                let itemToAppend: cacheDetails = {
                    type: section.type,
                    lineStart: itemInCache.position.start.line,
                    lineEnd: itemInCache.position.end.line,
                    position: itemInCache.position
                };
                // @ts-ignore
                if (itemInCache.heading) itemToAppend.headingText = itemInCache.heading; //check if there is heading text

                if (checkForBlockRefs && this.cache.blocks) { // check for block references and insert them
                    for(const b of Object.values(this.cache.blocks)) {
                        if (this.positionOfItemWithinSameRange(b.position, itemInCache.position)) {
                            itemToAppend.blockId = b.id;
                            break;
                        }
                    }
                }
                this.details.push(itemToAppend);
         }
        }; // cacheItems.forEach
    }

    // compares to Pos objects to see if they are in the same range
    positionOfItemWithinSameRange(firstPosition: Pos, secondPosition: Pos): boolean {
        return firstPosition.start.line >= secondPosition.start.line && firstPosition.end.line <= secondPosition.end.line
    }

}