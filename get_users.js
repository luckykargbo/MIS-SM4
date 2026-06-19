const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient("https://polite-roadrunner-192.convex.cloud");

async function main() {
  try {
    const users = await client.query("users:listUsersDebug");
    console.log("USERS_LIST_START");
    users.forEach(u => {
      console.log(`- ${u.name} | ${u.email} | ${u.role}`);
    });
    console.log("USERS_LIST_END");
  } catch (e) {
    console.error("Error fetching users:", e);
  }
}
main();
