import { FuzzySuggestModal, FuzzyMatch } from 'obsidian';
import TextTransporterPlugin from '../main';

export interface SuggesterItem {
  display: string; // displayed to user
  info: any; // supplmental info for the callback
}

/* USAGE: 
    let x = new GenericFuzzySuggester(this);
    let data = new Array<SuggesterItem>(); 
    for (let index = 0; index < 10000; index++) 
        data.push( { display: 'display me ' + index, info: 'info ' + index } );
    x.setSuggesterData(data);
    const result = x.display( (i: SuggesterItem, evt: MouseEvent | KeyboardEvent  )=>{ });
*/

export class GenericFuzzySuggester extends FuzzySuggestModal<SuggesterItem> {
  data: SuggesterItem[];
  callbackFunction: any;

  constructor(plugin: TextTransporterPlugin) {
    super(plugin.app);
    this.scope.register(['Shift'], 'Enter', (evt) => this.enterTrigger(evt));
    this.scope.register(['Ctrl'], 'Enter', (evt) => this.enterTrigger(evt));
  }

  setSuggesterData(suggesterData: Array<SuggesterItem>): void {
    this.data = suggesterData;
  }

  async display(callBack: (item: SuggesterItem, evt: MouseEvent | KeyboardEvent) => void): Promise<any> {
    this.callbackFunction = callBack;
    this.open();
  }

  getItems(): SuggesterItem[] {
    return this.data;
  }

  getItemText(item: SuggesterItem): string {
    return item.display;
  }

  onChooseItem(): void {
    return;
  } // required by TS, but not using

  renderSuggestion(item: FuzzyMatch<SuggesterItem>, el: HTMLElement): void {
    el.createEl('div', { text: item.item.display });
  }

  enterTrigger(evt: KeyboardEvent): void {
    const selectedText = document.querySelector('.suggestion-item.is-selected div').textContent;
    const item = this.data.find((i) => i.display === selectedText);
    if (item) {
      this.invokeCallback(item, evt);
      this.close();
    }
  }

  onChooseSuggestion(item: FuzzyMatch<SuggesterItem>, evt: MouseEvent | KeyboardEvent): void {
    this.invokeCallback(item.item, evt);
  }

  invokeCallback(item: SuggesterItem, evt: MouseEvent | KeyboardEvent): void {
    this.callbackFunction(item, evt);
  }
}
