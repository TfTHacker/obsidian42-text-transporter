import { Modal, Platform, Setting } from "obsidian";
import ThePlugin from "../main";
import * as transporter from "../features/transporterFunctions";
import { SilentFileAndTagSuggester } from "./silentFileAndTagSuggester";

export default class QuickCaptureModal extends Modal {
    plugin: ThePlugin;
    suggester: SilentFileAndTagSuggester;

    constructor(plugin: ThePlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    async submitForm(qcText: string): Promise<void> {
        if (qcText.trim().length === 0)
            return;  //no text do nothing 
        transporter.copyOrPushLineOrSelectionToNewLocationWithFileLineSuggester(this.plugin, true, qcText);
        this.close();
    }

    onOpen(): void {
        let qcInput = "";

        this.titleEl.createEl("div", "Quick Capture").setText("Quick Capture")

        this.contentEl.createEl("form", {}, (formEl) => {
            new Setting(formEl)
                .addTextArea((textEl) => {
                    textEl.onChange(value => qcInput = value);
                    textEl.inputEl.rows = 6;
                    if (Platform.isIosApp)
                        textEl.inputEl.style.width = "100%";
                    else if (Platform.isDesktopApp) {
                        textEl.inputEl.rows = 10;
                        textEl.inputEl.cols = 100;
                    }
                    textEl.inputEl.addEventListener("keydown", async (e: KeyboardEvent) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                            e.preventDefault();
                            await this.submitForm(qcInput);
                        }
                    });
                    window.setTimeout(() => textEl.inputEl.focus(), 10);
                    this.suggester = new SilentFileAndTagSuggester(this.plugin.app, textEl.inputEl);
                })

            formEl.createDiv("modal-button-container", (buttonContainerEl) => {
                buttonContainerEl
                    .createEl("button", { attr: { type: "submit" }, cls: "mod-cta", text: "Capture" })
                    .addEventListener("click", async (e) => {
                        e.preventDefault();
                        await this.submitForm(qcInput)
                    });
            });
        });
    }
}