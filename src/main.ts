import { Plugin, addIcon } from 'obsidian';
import FileSystem from './utils/fileSystem';
import PluginCommands from './ui/PluginCommands';
import { SettingsTab } from './ui/SettingsTab';
import { Settings, DEFAULT_SETTINGS } from './settings';

export default class TextTransporterPlugin extends Plugin {
  APP_NAME = this.manifest.name;
  APP_ID = this.manifest.id;
  settings: Settings;
  ribbonIcon: HTMLElement;
  fs: FileSystem;
  commands: PluginCommands;

  async onload(): Promise<void> {
    console.log('loading ' + this.APP_NAME);
    this.fs = new FileSystem(this);
    await this.loadSettings();
    this.commands = new PluginCommands(this);
    addIcons();
    this.ribbonIcon = this.addRibbonIcon('TextTransporter', this.APP_NAME, async () => this.commands.masterControlProgram(this));
    this.addSettingTab(new SettingsTab(this.app, this));
  }

  onunload(): void {
    console.log('unloading ' + this.APP_NAME);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

export function addIcons(): void {
  addIcon(
    'TextTransporter',
    `<path fill="currentColor" stroke="currentColor"  d="M 28.324219 21.484375 C 28.324219 25.257812 25.261719 28.320312 21.488281 28.320312 C 17.714844 28.320312 14.652344 25.257812 14.652344 21.484375 C 14.652344 17.707031 17.714844 14.648438 21.488281 14.648438 C 25.261719 14.648438 28.324219 17.707031 28.324219 21.484375 Z M 28.324219 21.484375 "/>
         <path fill="currentColor" stroke="currentColor"  d="M 36.679688 36.671875 C 40.738281 32.617188 42.972656 27.222656 42.972656 21.484375 C 42.972656 9.636719 33.335938 0 21.488281 0 C 9.644531 0 0.00390625 9.636719 0.00390625 21.484375 C 0.00390625 27.222656 2.242188 32.617188 6.296875 36.671875 L 21.488281 51.863281 Z M 8.792969 21.484375 C 8.792969 14.484375 14.488281 8.789062 21.488281 8.789062 C 28.488281 8.789062 34.183594 14.484375 34.183594 21.484375 C 34.183594 28.484375 28.488281 34.175781 21.488281 34.175781 C 14.488281 34.175781 8.792969 28.484375 8.792969 21.484375 Z M 8.792969 21.484375 "/>
         <path fill="currentColor" stroke="currentColor"  d="M 84.371094 62.28125 C 75.753906 62.28125 68.746094 69.289062 68.746094 77.902344 C 68.746094 82.078125 70.371094 86 73.320312 88.953125 L 84.371094 100 L 95.417969 88.953125 C 98.367188 86 99.992188 82.078125 99.992188 77.902344 C 99.992188 69.289062 92.984375 62.28125 84.371094 62.28125 Z M 84.371094 62.28125 "/>
         <path fill="currentColor" stroke="currentColor"  d="M 24.417969 81.132812 C 24.417969 73.96875 30.246094 68.140625 37.414062 68.140625 L 48.285156 68.140625 C 54.71875 68.140625 59.957031 62.902344 59.957031 56.464844 C 59.957031 50.027344 54.71875 44.792969 48.285156 44.792969 L 36.917969 44.792969 L 36.917969 50.652344 L 48.285156 50.652344 C 51.488281 50.652344 54.097656 53.257812 54.097656 56.464844 C 54.097656 59.671875 51.488281 62.28125 48.285156 62.28125 L 37.414062 62.28125 C 27.015625 62.28125 18.558594 70.738281 18.558594 81.132812 C 18.558594 91.53125 27.015625 99.988281 37.414062 99.988281 L 70.113281 99.988281 L 70.113281 94.128906 L 37.414062 94.128906 C 30.246094 94.128906 24.417969 88.300781 24.417969 81.132812 Z M 24.417969 81.132812 "/>`
  );
}
