import { createDailyNote, getAllDailyNotes, getDailyNote } from 'obsidian-daily-notes-interface';
import { moment } from "obsidian";

// Get or create DNP for today's date
async function getDnpForToday(): Promise<string> {
    let dnp = getDailyNote(moment(), getAllDailyNotes());
    if (dnp === null) dnp = await createDailyNote(moment());
    return dnp.path;
}

export { getDnpForToday }
