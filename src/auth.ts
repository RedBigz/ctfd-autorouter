import axios from "axios";
import { savedData, writeData } from "./savedData.js";
import { getCtfdInfoRaw } from "./info.js";
import type { CtfdCookies } from "./types.js";

export let authState: { loggedIn: undefined | boolean } = { loggedIn: undefined };

export async function checkIfLoggedIn(): Promise<boolean> {
    if (authState.loggedIn !== undefined) return authState.loggedIn;

    authState.loggedIn = false;

    if (savedData.url) {
        let resp = await axios.get(savedData.url + "/api/v1/users/me", savedData.cookies ? { headers: { "Cookie": savedData.cookies }, maxRedirects: 0, validateStatus: () => true } : undefined);

        authState.loggedIn = resp.status == 200;
    }

    return authState.loggedIn;
}

export async function gatherSession(url: string): Promise<boolean> {
    savedData.url = url;
    let resp = await axios.get(savedData.url);
    let cookies: CtfdCookies = <string>(<string[]>resp.headers["set-cookie"])[0];
    if (!cookies.includes("session")) return false;
    savedData.cookies = cookies;
    writeData(savedData);
    return true;
}

export async function gatherCSRFToken(): Promise<string | null> {
    if (!savedData.cookies || !savedData.url) return null;

    let raw = await getCtfdInfoRaw();
    if (!raw) return null;

    return raw.info.csrfNonce;
}

export enum CtfdLoginResult {
    Success,
    Failure,
    FailureSystem,
}

export async function login(url: string, username: string, password: string): Promise<CtfdLoginResult> {
    if (!await gatherSession(url)) return CtfdLoginResult.FailureSystem;

    let token = await gatherCSRFToken();

    if (!token) return CtfdLoginResult.FailureSystem;

    // create formdata
    const formData = new FormData();

    formData.append("name", username);
    formData.append("password", password);
    formData.append("nonce", token);

    let resp = await axios.post(savedData.url + "/login", formData, { headers: { "Cookie": savedData.cookies, "Content-Type": "multipart/form-data" }, maxRedirects: 0, validateStatus: () => true });

    if (resp.status == 302) {
        savedData.cookies = <string>(<string[]>resp.headers["set-cookie"])[0];
        writeData(savedData);

        return CtfdLoginResult.Success;
    }
    else {
        return CtfdLoginResult.Failure;
    }
}