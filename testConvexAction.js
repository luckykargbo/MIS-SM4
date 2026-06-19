const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient("https://polite-roadrunner-192.convex.cloud");

async function main() {
  try {
    console.log("Testing convex action...");
    const result = await client.action("emails:sendOtpEmail", {
      email: "hackerunlockme@gmail.com",
      otp: "999999"
    });
    console.log("Success:", result);
  } catch (e) {
    console.error("Convex Action Error:", e);
  }
}
main();
