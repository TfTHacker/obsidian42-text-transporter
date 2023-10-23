import { createDailyNote, getAllDailyNotes, getDailyNote } from 'obsidian-daily-notes-interface';
import { moment } from "obsidian";

// Get or create DNP for today's date
export async function getDnpForToday(): Promise<string> {
    let dnp = getDailyNote(moment(), getAllDailyNotes());
    if (dnp === null) dnp = await createDailyNote(moment());
    return dnp.path;
}

export async function getDnpForTomorrow(): Promise<string> {
    let dnp = getDailyNote(moment().add(1, 'days'), getAllDailyNotes());
    if (dnp === null) dnp = await createDailyNote(moment().add(1, 'days'));
    return dnp.path;
}
