const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient("https://polite-roadrunner-192.convex.cloud");

async function main() {
  try {
    const result = await client.mutation("users:resetUserPasswordDebug", {
      email: "jane.finance@example.com",
      newPassword: "admin12345"
    });
    console.log("Password reset response:", result);
  } catch (e) {
    console.error("Error resetting password:", e);
  }
}
main();
