import axios from "axios";
import { checkIfLoggedIn } from "./auth.js";
import { savedData } from "./savedData.js";
import { createWriteStream, write } from "node:fs";
import { promisify } from "node:util";
import { finished } from "node:stream";

interface ChallengeInfo {
    id: number;
    name: string;
    value: number; // points for solution
    description: string;
    attribution: string;
    category: string;
    type: string;
    files: string[]; // paths on the server for attachments
    solves: number;
    solved: boolean;
}

export class Challenge {
    info: ChallengeInfo;

    constructor(info: ChallengeInfo) {
        this.info = info;
    }

    async downloadAttachment(index: number, outPath: string): Promise<void> {
        // credit to Josh Sherman @ https://joshtronic.com/2021/12/19/downloading-files-in-nodejs-with-axios/
        // i tidied it up a bit make it easier to read as well :)

        const finishedDownload = promisify(finished);
        const writer = createWriteStream(outPath);

        const resp = await axios.get(savedData.url + <string>this.info.files[index], { headers: { "Cookie": savedData.cookies }, responseType: "stream" });

        resp.data.pipe(writer);
        await finishedDownload(writer);
    }

    async downloadAttachments(outDir: string): Promise<void> {
        for (let i = 0; i < this.info.files.length; i++) {
            this.downloadAttachment(i, outDir);
        }
    }
}

export async function fetchChallenge(id: number): Promise<Challenge> {
    let challengeResp = await axios.get(savedData.url + `/api/v1/challenges/${id}`, { headers: { "Cookie": savedData.cookies }, validateStatus: () => true });
    if (challengeResp.data.success !== true) throw Error("accessing challenge data unsuccessful");

    let { name, value, description, attribution, category, type, files, solves, solved_by_me } = challengeResp.data.data;
    return new Challenge(<ChallengeInfo>{ id, name, value, description, attribution, category, type, files, solves, solved: solved_by_me });
}

export async function fetchChallenges(): Promise<Challenge[]> {
    if (!await checkIfLoggedIn()) throw ReferenceError("attempted to fetch challenges but not authenticated");

    let challengesResp = await axios.get(savedData.url + "/api/v1/challenges", { headers: { "Cookie": savedData.cookies }, validateStatus: () => true });

    if (challengesResp.data.success !== true) throw Error("GET /api/v1/challenges unsuccessful");

    let challengeIds: number[] = challengesResp.data.data.map((challenge: any) => challenge.id);

    return await Promise.all(challengeIds.map(async (id) => fetchChallenge(id)));
}

export function organiseByCategory(challenges: Challenge[]) {
    let challengesByCategory: { [category: string]: Challenge[] } = {};

    for (let challenge of challenges) {
        (challengesByCategory[challenge.info.category] ??= []).push(challenge);
    }

    return challengesByCategory;
}