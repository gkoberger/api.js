import path from "path";
import utils from "./utils.js";
import prepare from "./prepare.js";
import serve from "./serve.js";

import { findUpSync, pathExists } from "find-up";

import { fileURLToPath } from "url";

const cmd = process.argv[2];

const __filename = fileURLToPath(import.meta.url);
let __dirname = path.dirname(__filename);

let workingDir = process.cwd();
if (cmd !== "init") {
  // If we aren't init-ing, make sure we're in a valid
  // directory.

  const configFile = findUpSync("api.config.json");
  if (!configFile) {
    console.log("This doesn't seem to be an API directory!".red);
    console.log(
      "Either run this command in a directory with a valid API config, or type `api init` to get started."
    );
    process.exit();
  }

  workingDir = path.dirname(configFile);
}

if (cmd === "init") {
  console.log("Setting up this repo...");

  const details = utils.prompter();

  const today = new Date().toISOString().split("T")[0];
  await details.ask({ type: "text", name: "NAME", message: "API Name" });
  await details.ask({
    type: "text",
    name: "DATE",
    message: "Release date",
    initial: today,
  });

  const vals = details.vals();

  const files = utils.copyDir(
    path.join(__dirname, "template"),
    workingDir,
    vals
  );
  console.log("");
  console.log("Creating files...");
  files.forEach((f) => console.log(` + ${f}`));

  console.log("");
  console.log("API created!".green);
  console.log("");
  console.log("");
  console.log("To add your first endpoint, run:");
  console.log("");
  console.log(" $ api add endpoint");
}

if (cmd === "add") {
  // TODO: also allow for adding other stuff
  console.log("Adding an endpoint...");

  const details = utils.prompter();

  await details.ask({
    type: "text",
    name: "resource",
    message: "Resource name?",
  });
  const vals = details.vals();

  utils.copyFile(
    path.join(__dirname, "template", "endpoints", "test.js"),
    path.join(workingDir, "endpoints", `${vals.resource}.js`),
    vals
  );

  console.log("");
  console.log("Endpoints created!".green);
  console.log("");
  console.log(
    "You can see your new endpoints in",
    `/endpoints/${vals.resource}.js`.cyan
  );
}

if (cmd === "dev") {
  console.log("Serving the API");
  console.log("");
  const api = await prepare(workingDir);
  serve(api, workingDir);
}

if (cmd === "oas") {
  const api = await prepare(workingDir);
  console.log(api.swagger);
}

if (cmd === "readme") {
  console.log("Set up ReadMe...");
}
