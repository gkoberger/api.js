/*
 * /{{resource}} Endpoints
 */

export async function list({ endpoint }) {
  endpoint({
    title: "List {{resource}}",
    description: "A list of {{resource}}",
  });

  return async ({ user }) => {
    return { name: user.name };
  };
};

export async function show({ endpoint, auth }) {
  endpoint({
    title: "Show {{resource}}",
    description: "Get a single {{resource}}",
  });

  // Params can be named anything, but must start with $ and be in order
  // So, for example, /{{resource}}/1 would set $id to 1
  return async ({ $id, user }) => {
    return { name: "John Doe" };
  };
};

export async function prepare({ endpoint, auth }) {
  endpoint({
    title: "Do something to {{resource}}",
    description: "This is an action, prepare",
  });

  return async ({ $param1, $param2, user }) => {
    return { name: user.name, param: $param };
  };
};
