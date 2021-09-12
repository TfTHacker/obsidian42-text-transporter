import { Modal, Setting } from "obsidian";
import ThePlugin from "../main";
import * as transporter from "../utils/transporterFunctions";

export default class quickCaptureModal extends Modal {
    plugin: ThePlugin;

    constructor(plugin: ThePlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    async submitForm(qcText: string): Promise<void> {
        if (qcText.trim().length === 0)
            return;  //no text do nothing
        transporter.copyOrPushLineOrSelectionToNewLocation(this.plugin, true, qcText);
        this.close();
    }

    onOpen(): void {
        let qcInput = "";

        this.titleEl.createEl("div", "Quick Capture").setText("Quick Capture")

        this.contentEl.createEl("form", {}, (formEl) => {
            new Setting(formEl)
                .addTextArea((textEl) => {
                    textEl.onChange(value => qcInput = value);
                    textEl.inputEl.rows = 5;
                    textEl.inputEl.cols = 80;
                    textEl.inputEl.addEventListener("keydown", async (e: KeyboardEvent) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                            e.preventDefault();
                            await this.submitForm(qcInput);
                        }
                    });
                    window.setTimeout(() => textEl.inputEl.focus(), 10);
                })

            formEl.createDiv("modal-button-container", (buttonContainerEl) => {
                buttonContainerEl
                    .createEl("button", { attr: { type: "submit" }, cls: "mod-cta", text: "Capture" })
                    .addEventListener("click", async () => await this.submitForm(qcInput));
            });
        });
    }
}