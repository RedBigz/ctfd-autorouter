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
            console.log(yellowFg("no challenge name includes the search term " + chalk.bold(<string>argv.name)));
            return;
        }

        await openShell(<Challenge>results[0]);
    })
    .help()
    .parse();