// this uses Catppuccin Mocha as a colour scheme. mauve is the preferred accent colour.

import chalk, { type ChalkInstance } from "chalk";

export type Colour = [number, number, number];

const rgb = (r: number, g: number, b: number): Colour => [r, g, b]; // saves time when copying RGB values from catppuccin's website
const deriveAnsi = (rgb: Colour): [ChalkInstance, ChalkInstance] => [chalk.bgRgb(...rgb), chalk.rgb(...rgb)];

// thank you catppuccin mocha :3
export const MAUVE = rgb(203, 166, 247);
export const RED = rgb(243, 139, 168);
export const GREEN = rgb(166, 227, 161);
export const YELLOW = rgb(249, 226, 175);

export const BASE = rgb(30, 30, 46);
export const SURFACE = rgb(49, 50, 68);

export const [mauveBg, mauveFg] = deriveAnsi(MAUVE);
export const [redBg, redFg] = deriveAnsi(RED);
export const [greenBg, greenFg] = deriveAnsi(GREEN);
export const [yellowBg, yellowFg] = deriveAnsi(YELLOW);

export const [baseBg, baseFg] = deriveAnsi(BASE);
export const [surfaceBg, surfaceFg] = deriveAnsi(SURFACE);

export const separator = "\ue0b0"; // powerline separator