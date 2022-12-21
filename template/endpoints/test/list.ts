/*
 * GET https://example.com/{{resource}}
 */

export default async function list({ user }) {
  return { name: user.name };
};

export async function documentation() {
  return {
    title: "List {{resource}}",
    description: "A list of {{resource}}",
  };
}
