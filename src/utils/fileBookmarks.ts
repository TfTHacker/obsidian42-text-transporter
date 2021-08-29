// Track recently used files

import { App } from "obsidian";

const MAX_NUMBER_OF_BOOKMARKS_FILES_TO_KEEP = 5

export default class fileBookmarks {
    app: App;

    constructor(app: App) { this.app = app; }

    addBookmark(filePath: string) {

    }

    removeBookmark(filePath: string) {
        
    }

    persistBookmarks() {

    }

}