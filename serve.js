import path from "path";

import YAML from "yaml";
import getParams from "get-function-params";

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

  // parse application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: false }));

  // parse application/json
  app.use(bodyParser.json());

  const endpoints = api.endpoints;

  Object.keys(endpoints).forEach((k) => {
    Object.keys(endpoints[k]).forEach((method) => {
      const endpoint = endpoints[k][method];

      const expressInputs = endpoint.expressInputs;

      console.log(" →", methodColors[expressInputs.method], expressInputs.path);

      app[expressInputs.method](expressInputs.path, async (req, res) => {
        const inputs = {
          req: {},
          user: false,
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
            return res.status(503).json({ error: "api key required" });
          }
        }

        if (endpoint.auth) {
          const auth = await endpoint.auth(authInput);
          if (!auth) {
            return res.status(503).json({ error: "no auth" });
          }

          inputs.user = auth;
        }

        const out = await endpoint.handler(inputs);
        res.status(200).send(out);
      });
    });
  });

  app.get("/", (req, res) => {
    res.json({
      welcome: "it's working!",
    });
  });

  app.get("/oas.json", (req, res) => {
    res.send(JSON.stringify(api.swagger, undefined, 2));
  });

  app.get("/oas.yaml", (req, res) => {
    res.send(YAML.stringify(api.swagger));
  });

  app.listen(port, () => {
    console.log("");
    console.log(`Example app listening on port ${port}`);
  });
};
