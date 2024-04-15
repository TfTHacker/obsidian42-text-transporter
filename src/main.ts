import { Plugin } from 'obsidian';
import FileSystem from './utils/fileSystem';
import PluginCommands from './ui/PluginCommands';
import { Settings, DEFAULT_SETTINGS, SettingsTab } from './ui/SettingsTab';
import { addIcons } from './ui/icons';

export default class ThePlugin extends Plugin {
  appName = this.manifest.name;
  appID = this.manifest.id;
  settings: Settings;
  ribbonIcon: HTMLElement;
  fs: FileSystem;
  commands: PluginCommands;

  async onload(): Promise<void> {
    console.log('loading ' + this.appName);
    this.fs = new FileSystem(this);
    await this.loadSettings();
    this.commands = new PluginCommands(this);
    addIcons();
    this.ribbonIcon = this.addRibbonIcon('TextTransporter', this.appName, async () => this.commands.masterControlProgram(this));
    this.addSettingTab(new SettingsTab(this.app, this));
  }

  onunload(): void {
    console.log('unloading ' + this.appName);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
