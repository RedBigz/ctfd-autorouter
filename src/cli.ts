#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import chalk from "chalk";

import { question } from "readline-sync";
import { oraPromise } from "ora";
import { checkIfLoggedIn, CtfdLoginResult, login } from "./auth.js";
import { savedData } from "./savedData.js";
import { getCtfdInfo } from "./info.js";
import { fetchChallenges, organiseByCategory, Challenge, fetchChallenge } from "./challenge.js";
import { preserveChallenges } from "./preserve.js";
import { openShell } from "./workspace.js";
import { mauveFg, redFg, greenFg, yellowFg } from "./scheme.js";
import { analyseFile, tagFile, type Tag } from "./heuristics.js";
import { readdir } from "node:fs/promises";
import { existsSync, read } from "node:fs";
import { join } from "node:path";

yargs(hideBin(process.argv))
    .command("login", "log into a CTFd instance", async () => {
        let url = question(`${mauveFg("enter CTFd URL")}: `);
        let username = question(`${mauveFg("enter username")}: `);
        let password = question(`${mauveFg("enter password")}: `, { hideEchoBack: true, history: false });

        let result = await oraPromise(login(url, username, password), { text: "authenticating..." });

        switch (result) {
            case CtfdLoginResult.Success:
                console.log(greenFg("authentication successful :3"));
                break;
            case CtfdLoginResult.Failure:
                console.log(redFg("authentication failed :(") + "\n" + chalk.grey("reason: incorrect credentials."));
                break;
            case CtfdLoginResult.FailureSystem:
                console.log(redFg("authentication failed :(") + "\n" + chalk.grey("reason: a session or an XSRF token could not be gathered."));
        }
    })
    .command("info", "shows current CTF info", async () => {
        if (!savedData.url) {
            console.log(redFg("please log in at least once to view CTF details."));
            return;
        }

        let info = await getCtfdInfo();
        if (!info) {
            console.log(redFg("there was an error gathering CTF details."));
            return;
        }

        console.log(chalk.bold(info.name));
        console.log(mauveFg("start date: ") + info.start);
        console.log(mauveFg("end date: ") + info.end);

        if (info.user.id != 0) {
            // user exists
            console.log(mauveFg(`[${info.user.id}] ${info.user.name} <${info.user.email}>`));
        } else {
            console.log(yellowFg(`not logged in; account details unavailable.`));
        }
    })
    .command("challenges", "shows a list of challenges", async () => {
        if (!await checkIfLoggedIn()) {
            console.log(redFg("please log in to view challenges."));
            return;
        }

        const challenges = organiseByCategory(await fetchChallenges());

        for (const category in challenges) {
            console.log(mauveFg(`${category}/`));

            for (const challenge of <Challenge[]>challenges[category]) {
                console.log("├─ " + (challenge.info.solved ? chalk.strikethrough : mauveFg)(`${challenge.info.name}`) + ` (${challenge.info.value})`)
            }
        }
    })
    .command("challenge <name>", "get info on a challenge", (yargs) => {
        yargs.positional("name", {
            type: "string",
            describe: "the name of the challenge (can be a substring!)"
        });
    }, async (argv) => {
        if (!await checkIfLoggedIn()) {
            console.log(redFg("please log in to view challenge info."));
            return;
        }

        const challenges = await fetchChallenges(); // this is wasteful but it should work :)

        const results = challenges.filter((challenge) => challenge.info.name.includes(<string>argv.name));

        if (results.length == 0) {
            console.log(yellowFg("no challenge name includes the search term " + chalk.bold(<string>argv.name)));
            return;
        }

        console.log(chalk.bold(`${results.length} result${results.length != 1 ? "s" : ""}`));

        for (let result of results) {
            console.log();
            
            console.log(mauveFg(result.info.category + "/") + result.info.name.replaceAll(<string>argv.name, chalk.underline(argv.name)));

            console.log("\n" + result.info.description);

            if (result.info.files.length > 0)
                console.log(mauveFg("\nattachments: " + Object.entries(result.info.files).map(([linkIndex, link]) => chalk.italic(`[${result.info.id}:${linkIndex}] `) + chalk.bold(new URL(savedData.url + link).pathname.split("/").pop())).join(", ")));
        }
    })
    .command("download <attachmentId>", "download an attachment", (yargs) => {
        yargs.positional("attachmentId", {
            type: "string",
            describe: "the attachment ID seen for a file when viewing a challenge with `ctf challenge <challenge>`"
        });
    }, async (argv) => {
        if (!await checkIfLoggedIn()) {
            console.log(redFg("please log in to download files."));
            return;
        }

        let attachmentId = <string>argv.attachmentId;

        if (!attachmentId.includes(":")) {
            console.log(redFg("attachment ID invalid. (correct example: 0:0)"));
            return;
        }

        let [challengeId, fileId] = attachmentId.split(":").map((num) => parseInt(num)) as [number, number];

        if (isNaN(challengeId) || isNaN(fileId)) {
            console.log(redFg("attachment ID numbers malformed. (correct example: 0:0)"));
            return;
        }

        let challenge = await fetchChallenge(challengeId);

        if (!challenge.info.files[fileId]) {
            console.log(redFg("attachment does not exist."));
            return;
        }

        let filename = new URL(savedData.url + challenge.info.files[fileId]).pathname.split("/").pop() as string;

        await oraPromise(challenge.downloadAttachment(fileId, filename), { text: "downloading " + filename, successText: "downloaded " + filename });
    })
    .command("preserve <output>", "preserve the CTF", (yargs) => {
        yargs.positional("output", {
            type: "string",
            describe: "the output directory"
        });
    }, async (argv) => {
        if (!await checkIfLoggedIn()) {
            console.log(redFg("please log in to execute this command."));
            return;
        }

        preserveChallenges(<string>argv.output);
    })
    .command("workspace <challenge>", "open a workspace with a CTF challenge", (yargs) => {
        yargs.positional("challenge", {
            type: "string",
            describe: "the name (or substring) of the challenge"
        });
    }, async (argv) => {
        if (!await checkIfLoggedIn()) {
            console.log(redFg("please log in to execute this command."));
            return;
        }

        const challenges = await fetchChallenges(); // this is wasteful but it should work :)

        const results = challenges.filter((challenge) => challenge.info.name.includes(<string>argv.challenge));

        if (results.length == 0) {
            console.log(yellowFg("no challenge name includes the search term " + chalk.bold(<string>argv.challenge)));
            return;
        }

        await openShell(<Challenge>results[0]);
    })
    .command("heur <file>", "perform heuristics on single file (dev)", (yargs) => {
        yargs.positional("file", {
            type: "string",
            describe: "path of the file to be analysed"
        });
    }, async (argv) => {
        const analysis = await analyseFile(<string>argv.file);
        const tags = tagFile(analysis);

        console.log(mauveFg("tags:"));

        tags.forEach((tag) => {
            console.log(" • " + tag);
        });
    })
    .command("rank <preservedCtf> <preference>", "rank challenges on (comma-separated) preference tags in a preserved CTF", (yargs) => {
        yargs.positional("preservedCtf", {
            type: "string",
            describe: "the path to a preserved ctf folder made with `ctf preserve <path>`"
        });

        yargs.positional("preference", {
            type: "string",
            describe: "a comma-separated list of tags you prefer. tags at the beginning will be preferred over the tags at the end. add * before a tag to exclude it. (available: dotnet, java, elf, dos, managed, unmanaged, model, cad, source, shell, graphic, image, archive)"
        });
    }, async (argv) => {
        const preservePath = <string>argv.preservedCtf;
        const list = (<string>argv.preference).split(",");

        if (!existsSync(preservePath) || !existsSync(join(preservePath, "instance.json"))) {
            console.log(redFg(`path or instance.json does not exist. make sure you preserved a ctf with \`ctf preserve ${preservePath}\`.`));
            return;
        }

        const prefTags = list.filter((tag) => !tag.startsWith("*"));
        const exclusionTags = list.filter((tag) => tag.startsWith("*")).map((tag) => tag.substring(1));

        const categories = (await readdir(preservePath, { withFileTypes: true })).filter((item) => item.isDirectory()).map((item) => item.name);

        // TAG SCORING SYSTEM
        // tags given will be indexed in *reverse order* (e.g. the first tag out of seven will score 7 rank units)
        // all tags in a CTF will be averaged to create the final rank.

        const scorePerTag: { [tag: string]: number } = prefTags.reduce((prev, curr, index) => ({...prev, [curr]: prefTags.length - index}), {});

        let ranks: { [challenge: string]: [number, Tag[], boolean] } = {};

        for (const category of categories) {
            const challenges = await readdir(join(preservePath, category));

            for (const challenge of challenges) {
                const path = join(preservePath, category, challenge);

                let localTags: Tag[] = [];

                const files = await readdir(path);

                for (const file of files) {
                    if (["challenge.json", "description"].includes(file)) continue;

                    const analysis = await analyseFile(join(path, file));

                    localTags = [...localTags, ...tagFile(analysis)];
                    localTags = localTags.filter((item, index) => localTags.indexOf(item) == index); // deduplicate
                }

                const totalScore = localTags.reduce((prev, curr) => prev + (scorePerTag[curr] || 0), 0);

                ranks[challenge] = [totalScore / Math.max(localTags.length, 1), localTags, localTags.some((tag) => exclusionTags.includes(tag))];
            }
        }

        console.log(mauveFg("suggestions (desc. order):") + "\n");

        Object.entries(ranks).toSorted((a, b) => b[1][0] - a[1][0]).forEach(([challenge, [rank, tags, excluded]]) => {
            let passthrough = (a: any): any => a;

            console.log((excluded ? chalk.strikethrough.grey : passthrough)(`[${rank}] ${challenge}${tags.length > 0 ? ` (${tags.join(", ")})` : ""}`));
        });
    })
    .help()
    .parse();