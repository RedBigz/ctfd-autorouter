import chalk from "chalk";

export type Colour = [number, number, number];

// thank you catppuccin mocha :3
export const MAUVE: Colour = [203, 166, 247];
export const BASE: Colour = [30, 30, 46];
export const SURFACE: Colour = [49, 50, 68];

export const mauveBg = chalk.bgRgb(...MAUVE);
export const mauveFg = chalk.rgb(...MAUVE);
export const baseBg = chalk.bgRgb(...BASE);
export const baseFg = chalk.rgb(...BASE);
export const surfaceBg = chalk.bgRgb(...SURFACE);
export const surfaceFg = chalk.rgb(...SURFACE);
export const separator = "\ue0b0";