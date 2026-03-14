import { defaultTestUsers, ensureTestUsers } from "../bootstrap/test-users.js";

const results = ensureTestUsers();

console.log("Initialized test users:");
for (const seedUser of defaultTestUsers) {
  const result = results.find((item) => item.username === seedUser.username);
  const state = result?.created ? "created" : "exists";
  console.log(`- ${seedUser.username} / ${seedUser.password} (${state})`);
}
