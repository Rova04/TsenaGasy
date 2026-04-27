// back/src/services/mailService.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify()
  .then(() => console.log("✅ SMTP prêt"))
  .catch((err) => console.error("❌ SMTP erreur:", err));

export async function sendFactureEmail(options: {
  to: string;
  subject: string;
text: string;
  html?: string;
  filePath: string;
  filename: string;
}) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: [
      {
        filename: options.filename,
        path: options.filePath,
      },
    ],
  });
}
