import { App } from "obsidian";
import { suggesterItem } from "../ui/genericFuzzySuggester";

enum fileSystemReturnType {
    foldersOnly = 1,
    filesOnly = 2,
    filesAndFolders = 3
}

const testFolderExclusion = (folder: string, exclusionFolders: Array<string>): boolean => {
    // return  true if should be excluded
    for (let eFolder of exclusionFolders)
        if (folder.startsWith(eFolder + '/'))
            return true
    return false;
};

const getFiles = async (app: App, rootPath: string, returnType: fileSystemReturnType, responseArray: Array<suggesterItem>, exclusionFolders: Array<string>) => {
    let list = await app.vault.adapter.list(rootPath);
    if (returnType === fileSystemReturnType.filesOnly || returnType === fileSystemReturnType.filesAndFolders)
        for (let file of list.files)
            if (!file.startsWith('.') && !testFolderExclusion(file, exclusionFolders))
                responseArray.push({ display: file, info: '' }); //add file to array

    for (let folder of list.folders) {
        if (!folder.startsWith('.') && !testFolderExclusion(folder + '/', exclusionFolders))
            if (returnType === fileSystemReturnType.foldersOnly || returnType === fileSystemReturnType.filesAndFolders)
                responseArray.push({ display: folder + '/', info: '' }); //add file to array
        await getFiles(app, folder, returnType, responseArray, exclusionFolders);
    }
};

const addLastOpenFiles = async (app: App, responseArray: Array<suggesterItem>) => {
    const lastOpenFiles = app.workspace.getLastOpenFiles().reverse();
    for (let index = 0; index < responseArray.length; index++) 
        if(lastOpenFiles.includes( responseArray[index].display ))
            responseArray.splice(index,1)
    
    for (let recentFile of lastOpenFiles)
        responseArray.unshift({ display: recentFile, info: '' }); //add file to array        
};

export default class fileSystem {
    app: App;
    exclusionFolders: Array<string> = [];

    constructor(app: App) { this.app = app };

    setExclusionFolders(exclusion: Array<string>): void {
        this.exclusionFolders = exclusion;
    };

    async getAllFolders(rootPath: string): Promise<Array<suggesterItem>> {
        let results: Array<suggesterItem> = [];
        await getFiles(this.app, rootPath, fileSystemReturnType.foldersOnly, results, this.exclusionFolders);
        return results;
    };

    async getAllFiles(rootPath: string): Promise<Array<suggesterItem>> {
        let results: Array<suggesterItem> = [];
        await getFiles(this.app, rootPath, fileSystemReturnType.filesOnly, results, this.exclusionFolders);
        await addLastOpenFiles(this.app, results);
        return results;
    };

    async getAllFoldersAndFiles(rootPath: string): Promise<Array<suggesterItem>> {
        let results: Array<suggesterItem> = [];
        await getFiles(this.app, rootPath, fileSystemReturnType.filesAndFolders, results, this.exclusionFolders);
        await addLastOpenFiles(this.app, results);
        return results;
    };
};