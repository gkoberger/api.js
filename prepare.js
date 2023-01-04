import path from "path";

import glob from 'glob';
import getParams from "get-function-params";

import { readdirSync, existsSync, readFileSync } from "fs";

export default async (workingDir) => {
  const config = JSON.parse(
    readFileSync(path.join(workingDir, "/api.config.json"))
  );

  const swagger = {
    openapi: "3.0.1",
    info: { version: config.version, title: config.title },
    paths: {},
  };

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
    workingDir += '/.api'
    const files = glob.sync(`${path.join(workingDir, "endpoints")}/**/*.js`);

    const endpoints = {};
    const eps = {};

    // This isn't a valid assumption long term
    // but right now this only works for /endpoints/{resource}/{method}.js
    // We should probably support arbitrary paths that map to the URL
    for (var i = 0; i < files.length; i++) {
      const f = files[i];
      const { resource, name } = f.match(/.*\/.api\/endpoints\/(?<resource>.*)\/(?<name>.*).js/).groups;
      const ep = await import(path.join(workingDir, "endpoints", resource, `${name}.js`));

      if(!eps[resource]) {
        eps[resource] = {};
      }

      // const endpointInfo = function (parent) {
      //   return function (info) {
      //     parent.title = info.title;
      //     parent.description = info.description;
      //   };
      // };
      // const authInfo = function (parent) {
      //   return function (handler) {
      //     parent.auth = handler;
      //   };
      // };

      eps[resource][name] = {
        method: ep.default,
        resource,
        documentation: ep.documentation,
        auth: ep.auth,
        errors: ep.errors,
      }

    //   const keys = Object.keys(ep);
    //   for (let i2 = 0; i2 < keys.length; i2++) {
    //     const method = keys[i2];

    //     if (expectsParam("endpoint", ep[method])) {
    //       eps[resource][method] = {
    //         method,
    //         resource,
    //       };
    //       eps[resource][method].handler = await ep[method]({
    //         endpoint: endpointInfo(eps[resource][method]),
    //         auth: authInfo(eps[resource][method]),
    //       });
    //     }
    //   }
    }
    return eps;
  }

  const endpoints = await getEndpoints();

  Object.keys(endpoints).forEach((k) => {
    Object.keys(endpoints[k]).forEach((v) => {
      const endpoint = endpoints[k][v];

      const createPath = (method) => {
        let path = ["/", endpoint.resource, '/', method.name];
        // if (!map[method.name]) {
        //   path.push(`/${method.name}`);
        // }
        getUrlParams(method).forEach((p) => {
          path.push(`/{${p}}`);
        });
        return path.join("");
      };

      const isDefaultMethod = !!map[endpoint.method.name];
      const expressInputs = {
        method: isDefaultMethod ? map[endpoint.method.name][0] : "post",
        path: createPath(endpoint.method),
      };

      endpoint.expressInputs = expressInputs;

      /* Swagger stuff */
      if (!swagger.paths[expressInputs.path]) {
        swagger.paths[expressInputs.path] = {};
      }
      swagger.paths[expressInputs.path][expressInputs.method] = {
        summary: endpoint.title,
        description: endpoint.description,
        parameters: [],
        tags: [endpoint.resource],
        responses: {
          200: {
            description: "OK",
          },
        },
      };

      if (endpoint.errors) {
        const endpointErrors = endpoint.errors();
        const oneOfError = [];
        endpointErrors.forEach(err => {
          oneOfError.push({
            type: "object",
            title: err.type,
            properties: {
              message: { type: "string", default: "" },
              type: { type: "string", default: err.type },
            },
          });
        });
        swagger.paths[expressInputs.path][
          expressInputs.method
        ].responses[400] = { // TODO: Support multiple status codes
          description: 'ERROR', // TODO: figure out how to show more useful info
          content: {
            "application/json": {
              schema: {
                oneOf: oneOfError,
              },
            },
          },
        };
      }

      getUrlParams(endpoint.method).forEach((p) => {
        swagger.paths[expressInputs.path][expressInputs.method].parameters.push(
          {
            name: p,
            in: "path",
            required: true,
            //"description": "The id of the pet to retrieve",
            schema: {
              type: "string",
            },
          }
        );
      });
      /* End swagger stuff */
    });
  });

  return {
    oas: swagger,
    endpoints,
  };
};
