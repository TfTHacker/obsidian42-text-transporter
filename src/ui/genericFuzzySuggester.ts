import { Notice, FuzzySuggestModal, FuzzyMatch, KeymapEventHandler } from 'obsidian';
import ThePlugin from '../main';

interface suggesterItem {
    display: string,        // displayed to user
    info: any               // supplmental info for the callback
}

/* USAGE:
    let x = new genericFuzzySuggester(this);
    let data = new Array<suggesterItem>();
    for (let index = 0; index < 10000; index++) 
        data.push( { display: 'display me ' + index, info: 'info ' + index } );
    x.setSuggesterData(data);
    const result = x.display( (i: suggesterItem, evt: MouseEvent | KeyboardEvent  )=>{ });
*/

class genericFuzzySuggester extends FuzzySuggestModal<suggesterItem>{
    data: suggesterItem[];
    callbackFunction: any;

    constructor(plugin: ThePlugin) {
        super(plugin.app);
        this.scope.register(["Shift"],"Enter", evt => this.shiftEnterTrigger(evt));
    }

    setSuggesterData(suggesterData: Array<suggesterItem>): void { this.data = suggesterData }

    async display(callBack: (item: suggesterItem, evt: MouseEvent | KeyboardEvent) => void): Promise<any> {
        this.callbackFunction = callBack;
        this.open();
    }

    getItems(): suggesterItem[] { return this.data  }

    getItemText(item: suggesterItem): string { return item.display }

    onChooseItem(): void { return } // required by TS, but not using

    renderSuggestion(item: FuzzyMatch<suggesterItem>, el: HTMLElement): void { el.createEl('div', { text: item.item.display }) }

    shiftEnterTrigger(evt: KeyboardEvent)  {
        console.log('shiftEnter')
        const selectedText = document.querySelector(".suggestion-item.is-selected div").textContent;
        const item = this.data.find( i => i.display === selectedText );
        if(item) {
            this.invokeCallback(item, evt);
            this.close();
        }
    }

    onChooseSuggestion(item: FuzzyMatch<suggesterItem>, evt: MouseEvent | KeyboardEvent): void { this.invokeCallback(item.item, evt) }

    invokeCallback(item: suggesterItem, evt: MouseEvent | KeyboardEvent): void { this.callbackFunction(item, evt) }
}

export { suggesterItem, genericFuzzySuggester };