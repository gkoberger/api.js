import path from "path";

import getParams from "get-function-params";
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import z from "zod";

extendZodWithOpenApi(z);

import { readdirSync, existsSync, readFileSync } from "fs";

export default async (workingDir) => {
  const config = JSON.parse(
    readFileSync(path.join(workingDir, "/api.config.json"))
  );

  const registry = new OpenAPIRegistry();

  /*
  const swagger = {
    openapi: "3.1.0",
    info: { version: config.version, title: config.title },
    paths: {},
  };
  */

  const map = {
    list: ["get", false],
    show: ["get", true],
    create: ["post", false],
    update: ["put", true],
    delete: ["delete", true],
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

  async function getEndpoints() {
    const getFiles = () =>
      readdirSync(path.join(workingDir, "endpoints"), {
        withFileTypes: true,
      }).filter((f) => f.name.match(/\.js$/));

    const endpoints = {};
    const eps = {};

    const files = getFiles();
    for (var i = 0; i < files.length; i++) {
      const f = files[i];
      const resource = f.name.replace(/\.js$/, "");
      const ep = await import(path.join(workingDir, "endpoints", f.name));

      eps[resource] = {};

      const endpointInfo = function (parent) {
        return function (info) {
          parent.title = info.title;
          parent.description = info.description;
        };
      };
      const authInfo = function (parent) {
        return function (handler) {
          parent.auth = handler;
        };
      };

      const versionInfo = function (parent) {
        parent.versionChanges = {};

        const chainable = (version) => ({
          body: (property, type, handler) => {
            if (!handler) {
              handler = type;
              type = undefined;
            }
            if (!parent.versionChanges[version]) {
              parent.versionChanges[version] = [];
            }
            parent.versionChanges[version].push({ property, type, handler });

            return chainable(version);
          },
        });

        return function (version) {
          return chainable(version);
        };
      };

      const bodyInfo = function (parent) {
        return function (body) {
          console.log(typeof body);
          parent.body = body;
          if (!parent.body._def) {
            parent.body = z.object(parent.body);
          }
        };
      };

      const keys = Object.keys(ep);
      for (let i2 = 0; i2 < keys.length; i2++) {
        const method = keys[i2];

        if (expectsParam("endpoint", ep[method])) {
          eps[resource][method] = {
            method,
            resource,
          };
          eps[resource][method].handler = await ep[method]({
            endpoint: endpointInfo(eps[resource][method]),
            auth: authInfo(eps[resource][method]),
            body: bodyInfo(eps[resource][method]),
            version: versionInfo(eps[resource][method]),
            z,
          });
        }
      }
    }
    return eps;
  }

  const endpoints = await getEndpoints();

  Object.keys(endpoints).forEach((k) => {
    Object.keys(endpoints[k]).forEach((v) => {
      const endpoint = endpoints[k][v];

      const createPath = (resource, method, handler) => {
        let path = ["/", resource];
        if (!map[method]) {
          path.push(`.${method}`);
        }
        getUrlParams(handler).forEach((p) => {
          path.push(`/{${p}}`);
        });
        return path.join("");
      };

      const isDefaultMethod = !!map[endpoint.method];
      const expressInputs = {
        method: isDefaultMethod ? map[endpoint.method][0] : "post",
        path: createPath(endpoint.resource, endpoint.method, endpoint.handler),
      };

      endpoint.expressInputs = expressInputs;

      /* Swagger stuff */

      const path = {
        summary: endpoint.title,
        description: endpoint.description,

        method: expressInputs.method,
        path: expressInputs.path,

        request: {},

        // Required at least one
        responses: {
          200: {
            description: "Object with user data.",
          },
        },
      };

      if (endpoint.body) {
        path.request.body = {
          //description: 'could go here',
          content: {
            "application/json": {
              schema: endpoint.body,
            },
          },
        };
      }

      const params = {};
      getUrlParams(endpoint.handler).forEach((p) => {
        // They're always strings b/c they come from the URL,
        // although eventually we could allow casting.
        params[p] = z.string();
      });

      if (Object.keys(params).length) {
        path.request.params = z.object(params);
      }

      registry.registerPath(path);

      /* End swagger stuff */
    });
  });

  const generator = new OpenApiGeneratorV31(registry.definitions);
  const oas = generator.generateDocument({
    openapi: "3.1.0",
    info: {
      version: config.version,
      title: config.title,
      //description: "This is the API",
    },
  });

  return {
    oas,
    endpoints,
  };
};
