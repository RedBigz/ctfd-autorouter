#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import chalk from "chalk";

import { question } from "readline-sync";
import { oraPromise } from "ora";
import { CtfdLoginResult, login } from "./auth.js";
import { savedData } from "./savedData.js";
import { getCtfdInfo } from "./info.js";

yargs(hideBin(process.argv))
    .command("login", "log into a CTFd instance", async () => {
        let url = question(`${chalk.magenta("enter CTFd URL")}: `);
        let username = question(`${chalk.magenta("enter username")}: `);
        let password = question(`${chalk.magenta("enter password")}: `, { hideEchoBack: true, history: false });

        let result = await oraPromise(login(url, username, password), { text: "authenticating..."} );
        
        switch (result) {
            case CtfdLoginResult.Success:
                console.log(chalk.green("authentication successful :3"));
                break;
            case CtfdLoginResult.Failure:
                console.log(chalk.red("authentication failed :(") + "\n" + chalk.grey("reason: incorrect credentials."));
                break;
            case CtfdLoginResult.FailureSystem:
                console.log(chalk.red("authentication failed :(") + "\n" + chalk.grey("reason: a session or an XSRF token could not be gathered."));
        }
    })
    .command("info", "shows current CTF info", async () => {
        if (!savedData.url) {
            console.log(chalk.red("please log in at least once to view CTF details."));
            return;
        }

        let info = await getCtfdInfo();
        if (!info) {
            console.log(chalk.red("there was an error gathering CTF details."));
            return;
        }

        console.log(chalk.bold(`${info.name}`));

        if (info.user.id != 0) {
            // user exists
            console.log(chalk.magenta(`[${info.user.id}] ${info.user.name} <${info.user.email}>`));
        } else {
            console.log(chalk.yellow(`not logged in; account details unavailable.`));
        }
    })
    .help()
    .parse();