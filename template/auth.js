const users = {
  'abc123': { name: 'Gregory Koberger', email: 'gkoberger@gmail.com' },
  'test123': { name: 'Owlbert', email: 'owlbert@test.com' },
};

export default async ({ apiKey }) => {
  let user;

  // This is where you get information about a person
  user = users[apiKey];

  // Returning a falsey value will cause an error
  return user;
}

export async function openToAll({ }) {
  return {};
}
