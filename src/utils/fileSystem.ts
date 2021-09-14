import { App } from "obsidian";
import ThePlugin from "../main";
import { suggesterItem } from "../ui/genericFuzzySuggester";

enum fileSystemReturnType {
    foldersOnly = 1,
    filesOnly = 2,
    filesAndFolders = 3
}

const testFolderExclusion = (folder: string, exclusionFolders: Array<string>): boolean => {
    // return  true if should be excluded
    for (const eFolder of exclusionFolders)
        if (folder.startsWith(eFolder + '/'))
            return true
    return false;
};

const getFiles = async (app: App, rootPath: string, returnType: fileSystemReturnType, responseArray: Array<suggesterItem>, exclusionFolders: Array<string>) => {

    if (returnType === fileSystemReturnType.filesOnly || returnType === fileSystemReturnType.filesAndFolders)
        for (const file of app.vault.getMarkdownFiles())
            if (!testFolderExclusion(file.path, exclusionFolders))
                responseArray.push({ display: file.path, info: file.path }); //add file to array

    if (returnType === fileSystemReturnType.foldersOnly || returnType === fileSystemReturnType.filesAndFolders) {
        for (const folder of (await app.vault.adapter.list(rootPath)).folders) {
            if (!folder.startsWith('.') && !testFolderExclusion(folder + '/', exclusionFolders))
                if (returnType === fileSystemReturnType.foldersOnly || returnType === fileSystemReturnType.filesAndFolders)
                    responseArray.push({ display: folder + '/', info: '' }); //add file to array
            await getFiles(app, folder, returnType, responseArray, exclusionFolders);
        }
    }

};

const addLastOpenFiles = async (app: App, responseArray: Array<suggesterItem>) => {
    const lastOpenFiles = app.workspace.getLastOpenFiles();
    if (lastOpenFiles.length === 0) return

    //confirm file exists
    for (let iLF = 0; iLF < lastOpenFiles.length; iLF++) 
        if(await app.vault.adapter.exists(lastOpenFiles[iLF])===false) 
            lastOpenFiles.splice(iLF,1)

    //remove recent files from  list
    for (let iLF = 0; iLF < lastOpenFiles.length; iLF++) {
        const recentFile = lastOpenFiles[iLF];
        for (let iFile = 0; iFile < responseArray.length; iFile++) {
            if (recentFile===responseArray[iFile].info){
                responseArray.splice(iFile,1)
                break;
            }
        }
    }

    // add recent  files  to the top of the list
    for (let i = lastOpenFiles.length-1; i >=0; i--) 
        responseArray.unshift({ display: "Recent file: " + lastOpenFiles[i], info: lastOpenFiles[i] }); //add file to array        
};

export default class fileSystem {
    plugin: ThePlugin;
    exclusionFolders: Array<string> = [];
    dnpLabel: string;

    constructor(plugin: ThePlugin) {
        this.plugin = plugin;
    }

    setExclusionFolders(exclusion: Array<string>): void {
        this.exclusionFolders = exclusion;
    }

    async getAllFolders(rootPath: string): Promise<Array<suggesterItem>> {
        const results: Array<suggesterItem> = [];
        await getFiles(this.plugin.app, rootPath, fileSystemReturnType.foldersOnly, results, this.exclusionFolders);
        return results;
    }

    async getAllFiles(rootPath: string): Promise<Array<suggesterItem>> {
        const results: Array<suggesterItem> = [];
        await getFiles(this.plugin.app, rootPath, fileSystemReturnType.filesOnly, results, this.exclusionFolders);
        await addLastOpenFiles(this.plugin.app, results);
        return results;
    }

    async getAllFoldersAndFiles(rootPath: string): Promise<Array<suggesterItem>> {
        const results: Array<suggesterItem> = [];
        await getFiles(this.plugin.app, rootPath, fileSystemReturnType.filesAndFolders, results, this.exclusionFolders);
        await addLastOpenFiles(this.plugin.app, results);
        return results;
    }
}