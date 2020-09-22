import fs from "fs";
import * as core from "@actions/core";

export let settings = {};

export const readJSON = (filePath: string): object => {
  const data = fs.readFileSync(filePath);

  return JSON.parse(data.toString());
};

export const configure = async () => {
  const configPath = core.getInput("config");

  if (configPath) {
    settings = readJSON(`${process.env.GITHUB_WORKSPACE}/${configPath}`);
  }

  settings["config-path"] = configPath;
};
