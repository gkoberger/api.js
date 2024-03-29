import path from "path";

import YAML from "yaml";
import getParams from "get-function-params";
import helmet from "helmet";
import z from "zod";

import colors from "colors";
import { readdirSync, existsSync, readFileSync } from "fs";

import express from "express";

import bodyParser from "body-parser";

export default async (api, workingDir) => {
  const methodColors = {
    get: "GET ".green,
    post: "POST".cyan,
    put: "PUT ".magenta,
    delete: "DEL ".red,
  };

  const listParams = (fn) =>
    getParams(fn)[0]
      .param.replace(/[^_$a-zA-Z0-9]+/g, " ")
      .trim()
      .split(" ");

  const expectsParam = (param, fn) =>
    getParams(fn)[0]
      .param.replace(/[^_$a-zA-Z0-9]+/g, " ")
      .trim()
      .split(" ")
      .indexOf(param) > -1;

  const getUrlParams = (fn) =>
    getParams(fn)[0]
      .param.replace(/[^_$a-zA-Z0-9]+/g, " ")
      .trim()
      .split(" ")
      .filter((p) => !!p.match(/^\$/))
      .map((p) => p.replace(/^\$/, ""));

  const app = express();
  const port = 3444;

  app.use(helmet());

  app.use((req, res, next) => {
    // temp success/error handling

    res.reply = (status, message) => {
      let log;
      if (status < 300) {
        log = `🟢 ${`${status}`.green}`;
      } else {
        log = `🔴 ${`${status}`.red}`;
      }
      console.log(`${log}  ${req.method.toUpperCase().bold} ${req.path}  ${JSON.stringify(message).gray}`.substr(0, process.stdout.columns));
      return res.status(status).json(message);
    };

    next();
  });

  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }));

  // parse application/json
  app.use(bodyParser.json());

  const endpoints = api.endpoints;

  Object.keys(endpoints).forEach((k) => {
    Object.keys(endpoints[k]).forEach((method) => {
      const endpoint = endpoints[k][method];

      const expressInputs = endpoint.expressInputs;

      const useExpressPath = (i) => i.replace(/{(.*?)}/g, (k, v) => `:${v}`);

      console.log(
        " →",
        methodColors[expressInputs.method],
        useExpressPath(expressInputs.path)
      );

      app[expressInputs.method](
        useExpressPath(expressInputs.path),
        async (req, res) => {
          // A temp function for consolidating the success and errors

          const inputs = {
            req: {},
            user: false,
            body: {},
          };

          getUrlParams(endpoint.handler).forEach((param) => {
            inputs[`$${param}`] = req.params[param];
          });

          const authInput = {};

          if (!endpoint.auth) {
            endpoint.auth = (
              await import(path.join(workingDir, "auth.js"))
            ).default;
          }

          if (expectsParam("apiKey", endpoint.auth)) {
            authInput.apiKey =
              req.headers["api-key"] ||
              req.headers["x-api-key"] ||
              req.query["api-key"];
            if (!authInput.apiKey) {
              return res.reply(503, { error: "api key required" });
            }
          }

          if (endpoint.auth) {
            const auth = await endpoint.auth(authInput);
            if (!auth) {
              return res.reply(503, { error: "no auth" });
            }

            inputs.user = auth;
          }

          /* Handle the body */

          if (Object.keys(endpoint.versionChanges).length) {
            // TODO: sort this in version order!
            //

            for (let v in endpoint.versionChanges) {
              const version = endpoint.versionChanges[v];
              for (var i = 0; i < version.length; i++) {
                const change = version[i];
                if (req.body[change.property]) {
                  if (!change.type || req.body[change.property].constructor === change.type) {
                    // handle both cast and deprecations here
                    req.body[change.property] = change.handler(
                      req.body[change.property], req.body
                    );
                  }
                }
              }

              //proper,type,handler
            }
          }

          inputs.body = req.body;
          const parseBody = endpoint.body.safeParse(inputs.body);

          if (!parseBody.success) {
            const error = parseBody.error.issues[0];

            return res.reply(503, { error: `${error.message} (${error.path.join('.')})` });
          }

          try {
            const out = await endpoint.handler(inputs);
            return res.reply(200, out);
          } catch (e) {
            console.log("ERROR", e);
          }
        }
      );
    });
  });

  app.get("/", (req, res) => {
    res.json({
      welcome: "it's working!",
    });
  });

  app.get("/oas.json", (req, res) => {
    res.send(JSON.stringify(api.oas, undefined, 2));
  });

  app.get("/oas.yaml", (req, res) => {
    res.send(YAML.stringify(api.oas));
  });

  app.use((req, res) => {
    return res.reply(404, { error: "page not found" });
  });

  app.listen(port, () => {
    console.log("");
    console.log(`Running the API at https://localhost:${port}`);
    console.log("");
  });
};
