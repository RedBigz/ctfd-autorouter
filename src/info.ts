import axios from "axios";
import { savedData } from "./savedData.js";

export interface CtfdInfo {
    /**
     * The name of the CTFd instance.
     */
    name: string;

    /**
     * User information.
     */
    user: {
        /**
         * The ID of the user.
         */
        id: number;

        /**
         * The name of the user.
         */
        name: string | null;

        /**
         * The email address of the user.
         */
        email: string | null;
    };

    /**
     * The time that the CTF will start at.
     */
    start: Date;

    /**
     * The time that the CTF will end at.
     */
    end: Date;
}

export async function getCtfdInfoRaw() {
    if (!savedData.url) return null;

    let data: string = (await axios.get(savedData.url, savedData.cookies ? { headers: { "Cookie": savedData.cookies } } : undefined)).data;

    let title: string = (<any>data.match(/<title>(.+?)<\/title>/m))[1]
    let info: any = JSON.parse((<string>(<any>data.match(/window\.init = ({(.|\n)+?})/m))[1]).replaceAll(/\'/gm, "\"").replaceAll(/,\n.*?"eventSounds"(.|\n)*?],/gm, ""));

    return { title, info };
}

export async function getCtfdInfo(): Promise<CtfdInfo | null> {
    let raw = await getCtfdInfoRaw();
    if (!raw) return null;

    let { title, info } = raw;
    
    return {
        name: title,
        user: { id: info.userId, name: info.userName, email: info.userEmail },
        start: new Date(info.start * 1000),
        end: new Date(info.end * 1000),
    };
}