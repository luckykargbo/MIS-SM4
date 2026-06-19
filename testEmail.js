const nodemailer = require("nodemailer");

async function main() {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "hackerunlockme@gmail.com",
      pass: "spkpyoffghooeywq",
    },
  });

  let info = await transporter.sendMail({
    from: '"Test" <hackerunlockme@gmail.com>',
    to: "hackerunlockme@gmail.com",
    subject: "Hello",
    text: "Testing email",
  });

  console.log("Message sent: %s", info.messageId);
}

main().catch(console.error);
