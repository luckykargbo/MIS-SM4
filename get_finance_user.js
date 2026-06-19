const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient("https://polite-roadrunner-192.convex.cloud");

async function main() {
  // Let's run a query to fetch users or check what users exist
  try {
    // Get all users by querying a list if possible, or try search_emails.js logic
    const dbUsers = await client.query("users:getCurrentUser", { userId: "jh77vdxpy8w216f4kghypjnygs6zk971" });
    console.log("Database user response:", dbUsers);
  } catch(e) {
    console.error("Query failed:", e);
  }
}
main();
