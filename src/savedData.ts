import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CtfdCookies } from "./types.js";

interface SavedData {
    url?: string;
    cookies?: CtfdCookies; // this feels wrong 
}

export const DATA_PATH = process.env.CTFD_CONFIG || join(homedir(), ".ctfd.json");

export function readData(): SavedData {
    if (!existsSync(DATA_PATH)) writeData({});
    return <SavedData>JSON.parse(readFileSync(DATA_PATH).toString()); // let's just assume it's the correct type :)
}

export function writeData(data: SavedData) {
    writeFileSync(DATA_PATH, JSON.stringify(data));
}

export let savedData = readData(); // should be a pointer right?