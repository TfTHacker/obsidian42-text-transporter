import { FuzzySuggestModal, FuzzyMatch, MarkdownView } from 'obsidian';
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
    }

    setSuggesterData(suggesterData: Array<suggesterItem>): void { this.data = suggesterData };

    async display(callBack: (item: suggesterItem, evt: MouseEvent | KeyboardEvent) => void): Promise<any> {
        this.callbackFunction = callBack;
        this.open();
    }

    query(searchText: string): any {
        let results = [];
        const searchTerm = searchText.toLocaleLowerCase();
        let countOfFoundMatches = 0;
        for (let i = 0; (i < this.data.length && countOfFoundMatches < 30); i++) {
            let item = this.data[i];
            if (item['display'].toLowerCase().contains(searchTerm)) {
                results.push(this.data[i]);
                countOfFoundMatches++;
            }
        }
        return results;
    }

    getItems(): suggesterItem[] {
        let searchTerm = this.inputEl.value.trim();
        //display first  20 items from suggesterItem array or show results of search
        return searchTerm === '' ? this.data.slice(0, 20) : this.query(searchTerm)
    };

    getItemText(item: suggesterItem) { return item.display };

    onChooseItem(item: suggesterItem, evt: MouseEvent | KeyboardEvent) { }

    renderSuggestion(item: FuzzyMatch<suggesterItem>, el: HTMLElement) { el.createEl('div', { text: item.item.display }) };

    onChooseSuggestion(item: FuzzyMatch<suggesterItem>, evt: MouseEvent | KeyboardEvent): void { this.callbackFunction(item, evt) };

}

export { suggesterItem, genericFuzzySuggester }