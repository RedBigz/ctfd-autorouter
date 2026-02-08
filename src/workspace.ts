import chalk from "chalk";
import { exec, spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type { Challenge } from "./challenge.js";
import { getCtfdInfo } from "./info.js";
import slugify from "slugify";
import { oraPromise } from "ora";
import { existsSync } from "node:fs";
import { baseBg, surfaceBg, baseFg, separator, mauveBg, surfaceFg, mauveFg } from "./scheme.js";
import { promisify } from "node:util";

export async function openShell(challenge: Challenge) {
    let tempDir = await mkdtemp(join(tmpdir(), "ctfd-ws-"));

    const info = await getCtfdInfo();
    if (info === null) return;

    let slug = slugify.default(info.name, { lower: true, remove: /[*+~.()'"!:@]/g }); // using a slug just in case the CTF name is an invalid filename on linux

    let workspacePath = join(homedir(), "ctfd-workspaces", slug, challenge.info.category, challenge.info.name);
    const needsDownload = !existsSync(workspacePath); // check if a download of the challenge is needed
    await mkdir(workspacePath, { recursive: true });
    if (needsDownload) await oraPromise(challenge.downloadAttachments(workspacePath), { text: "Downloading challenge...", successText: "Downloaded challenge!" }); // download the attachments

    let rcPath = join(tempDir, "rc_file");

    const prompt = baseBg(` ${info.name} `) + surfaceBg(baseFg(separator) + ` ${challenge.info.category} `) + mauveBg(surfaceFg(separator) + ` ${challenge.info.name} `) + mauveFg(separator) + "\n"
        + `${mauveFg(`${chalk.bold("[workspace]")} $(realpath --relative-to="${workspacePath}" $(pwd)) `)} > `;

    await writeFile(rcPath, `[ -f ~/.bashrc ] && . ~/.bashrc; cd ${workspacePath}; export PS1="${prompt}";`)

    // show description and files

    console.log(`${chalk.bold(challenge.info.name)}

${mauveFg(challenge.info.description)}

${(await promisify(exec)("ls -hl " + workspacePath)).stdout}`);

    const proc = spawn(`bash`, ["--rcfile", rcPath, "-i"], { stdio: "inherit" }); // spawn a bash instance

    proc.on("exit", async () => {
        await rm(tempDir, { recursive: true, force: true });
    });
}