import { FuzzySuggestModal, FuzzyMatch } from 'obsidian';
import ThePlugin from '../main';

const MAX_RESULTS_TO_RETURN = 100;

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
    }

    setSuggesterData(suggesterData: Array<suggesterItem>): void { this.data = suggesterData }

    async display(callBack: (item: suggesterItem, evt: MouseEvent | KeyboardEvent) => void): Promise<any> {
        this.callbackFunction = callBack;
        this.open();
    }

    query(searchText: string): any {
        const results = [];
        const searchTerm = searchText.toLocaleLowerCase();
        let countOfFoundMatches = 0;
        for (let i = 0; (i < this.data.length && countOfFoundMatches < MAX_RESULTS_TO_RETURN); i++) {
            const item = this.data[i];
            if (item['display'].toLowerCase().contains(searchTerm)) {
                results.push(this.data[i]);
                countOfFoundMatches++;
            }
        }
        return results;
    }

    getItems(): suggesterItem[] {
        const searchTerm = this.inputEl.value.trim();
        //display first  20 items from suggesterItem array or show results of search
        return searchTerm === '' ? this.data.slice(0, MAX_RESULTS_TO_RETURN) : this.query(searchTerm)
    }

    getItemText(item: suggesterItem): string { return item.display }

    onChooseItem(): void { return } // required by TS, but not using

    renderSuggestion(item: FuzzyMatch<suggesterItem>, el: HTMLElement): void { el.createEl('div', { text: item.item.display }) }

    onChooseSuggestion(item: FuzzyMatch<suggesterItem>, evt: MouseEvent | KeyboardEvent): void { this.callbackFunction(item, evt) }

}

export { suggesterItem, genericFuzzySuggester };