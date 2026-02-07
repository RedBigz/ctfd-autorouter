import { oraPromise } from "ora";
import { fetchChallenges, organiseByCategory } from "./challenge.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getCtfdInfo } from "./info.js";

export async function preserveChallenges(outDir: string) {
    const challenges = await oraPromise(fetchChallenges(), { text: "fetching all challenges"});

    for (let challenge of challenges) {
        await oraPromise(async () => {
            let folder = join(outDir, challenge.info.category, challenge.info.name);

            await mkdir(folder, { recursive: true });

            await writeFile(join(folder, "description"), challenge.info.description);
            await writeFile(join(folder, "challenge.json"), JSON.stringify(challenge.info, undefined, 4))
            await challenge.downloadAttachments(folder);
        }, { text: `preserving challenge ${challenge.info.category}/${challenge.info.name}`, successText: `preserved challenge ${challenge.info.category}/${challenge.info.name}` });
    }

    await oraPromise(writeFile(join(outDir, "instance.json"), JSON.stringify(await getCtfdInfo(), undefined, 4)), { text: "preserving instance info", successText: "preserved instance info" });
}