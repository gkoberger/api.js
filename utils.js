import fs from "fs";
import path from "path";

import enquirer from "enquirer";

const utils = {
  copyDir: (from, to, replace) => {
    const files = [];
    fs.readdirSync(from).forEach((element) => {
      if (fs.lstatSync(path.join(from, element)).isFile()) {
        utils.copyFile(
          path.join(from, element),
          path.join(to, element),
          replace
        );
        files.push(element);
      } else {
        fs.mkdirSync(path.join(to, element));
        files.push(element);
      }
    });
    return files;
  },
  copyFile: (from, to, replace) => {
    let content = fs.readFileSync(from, "utf8");

    content = content.replace(
      /{{([-_a-zA-Z0-9]+)}}/g,
      (y) => replace[y.replace(/[{}]/g, "")] || `{{${y}}}`
    );

    fs.writeFileSync(to, content);
  },
  makeDir: (path) => {
    fs.mkdirSync(path);
  },
  prompter: function () {
    const info = {};
    return {
      ask: async (input) => {
        if (!!input.options) {
          // it's NumberPrompt or something
          try {
            return (info[input.name] = await input.run());
          } catch (e) {
            console.log("Init exited".red);
            process.exit(0);
          }
        }

        if (input.choices) {
          input.choices = utils.formatInput(input.choices);
        }

        try {
          const val = await enquirer.prompt(input);
          info[input.name] = val[input.name];
          return val;
        } catch (e) {
          console.log("Init exited".red);
          process.exit(0);
        }
      },
      vals: () => info,
      info,
      set: (k, v) => {
        info[k] = v;
      },
    };
  },
};

export default utils;
