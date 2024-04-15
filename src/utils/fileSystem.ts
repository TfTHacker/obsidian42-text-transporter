import { App, TAbstractFile, TFolder, Vault } from 'obsidian';
import ThePlugin from '../main';
import { SuggesterItem } from '../ui/genericFuzzySuggester';

enum FileSystemReturnType {
  foldersOnly = 1,
  filesOnly = 2,
  filesAndFolders = 3
}

function testFolderExclusion(folder: string, exclusionFolders: Array<string>): boolean {
  // return  true if should be excluded
  for (const eFolder of exclusionFolders) if (folder.startsWith(eFolder + '/')) return true;
  return false;
}

async function getFiles(app: App, returnType: FileSystemReturnType, responseArray: Array<SuggesterItem>, exclusionFolders: Array<string>) {
  // first list just files
  if (returnType === FileSystemReturnType.filesOnly || returnType === FileSystemReturnType.filesAndFolders)
    for (const file of app.vault.getMarkdownFiles())
      if (!testFolderExclusion(file.path, exclusionFolders)) responseArray.push({ display: file.path, info: file.path }); //add file to array

  // second list folders
  if (returnType === FileSystemReturnType.foldersOnly || returnType === FileSystemReturnType.filesAndFolders) {
    Vault.recurseChildren(app.vault.getRoot(), (abstractFile: TAbstractFile) => {
      if (abstractFile instanceof TFolder) {
        const path = abstractFile.path === '/' ? abstractFile.path : abstractFile.path + '/';
        responseArray.push({ display: path, info: path }); //add file to array
      }
    });
  }
}

async function addLastOpenFiles(app: App, responseArray: Array<SuggesterItem>) {
  const lastOpenFiles = app.workspace.getLastOpenFiles();
  if (lastOpenFiles.length === 0) return;

  //confirm file exists
  for (let iLF = 0; iLF < lastOpenFiles.length; iLF++)
    if ((await app.vault.adapter.exists(lastOpenFiles[iLF])) === false) lastOpenFiles.splice(iLF, 1);

  //remove recent files from  list
  for (let iLF = 0; iLF < lastOpenFiles.length; iLF++) {
    const recentFile = lastOpenFiles[iLF];
    for (let iFile = 0; iFile < responseArray.length; iFile++) {
      if (recentFile === responseArray[iFile].info) {
        responseArray.splice(iFile, 1);
        break;
      }
    }
  }

  // add recent  files  to the top of the list
  for (let i = lastOpenFiles.length - 1; i >= 0; i--)
    responseArray.unshift({ display: 'Recent file: ' + lastOpenFiles[i], info: lastOpenFiles[i] }); //add file to array
}

export default class FileSystem {
  plugin: ThePlugin;
  exclusionFolders: Array<string> = [];
  dnpLabel: string;

  constructor(plugin: ThePlugin) {
    this.plugin = plugin;
  }

  setExclusionFolders(exclusion: Array<string>): void {
    this.exclusionFolders = exclusion;
  }

  async getAllFolders(): Promise<Array<SuggesterItem>> {
    const results: Array<SuggesterItem> = [];
    await getFiles(this.plugin.app, FileSystemReturnType.foldersOnly, results, this.exclusionFolders);
    return results;
  }

  async getAllFiles(): Promise<Array<SuggesterItem>> {
    const results: Array<SuggesterItem> = [];
    await getFiles(this.plugin.app, FileSystemReturnType.filesOnly, results, this.exclusionFolders);
    await addLastOpenFiles(this.plugin.app, results);
    return results;
  }

  async getAllFoldersAndFiles(): Promise<Array<SuggesterItem>> {
    const results: Array<SuggesterItem> = [];
    await getFiles(this.plugin.app, FileSystemReturnType.filesAndFolders, results, this.exclusionFolders);
    await addLastOpenFiles(this.plugin.app, results);
    return results;
  }
}
