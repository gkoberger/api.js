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

          /* Handle the body */

          // TODO: Do these all at once, so the order
          // of the transformations is preserved

          if (endpoint.deprecations.length) {
            for (var i = 0; i < endpoint.deprecations.length; i++) {
              const deprecate = endpoint.deprecations[i];
              if (req.body[deprecate.property]) {
                deprecate.handler(req.body[deprecate.property], req.body);
                delete req.body[deprecate.property];
              }

              //proper,type,handler
            }
          }

          if (endpoint.casts.length) {
            for (var i = 0; i < endpoint.casts.length; i++) {
              const cast = endpoint.casts[i];
              if (req.body[cast.property]) {
                if (req.body[cast.property].constructor === cast.type) {
                  req.body[cast.property] = cast.handler(
                    req.body[cast.property]
                  );
                }
              }

              //proper,type,handler
            }
          }

          inputs.body = req.body;
          const parseBody = z.object(endpoint.body).safeParse(inputs.body);

          if (!parseBody.success) {
            // TODO: this is temp
            return res.status(503).json({ error: true });
          }

          try {
            const out = await endpoint.handler(inputs);
            res.status(200).send(out);
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

  app.listen(port, () => {
    console.log("");
    console.log(`Example app listening on port ${port}`);
  });
};
