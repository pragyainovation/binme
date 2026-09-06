import "server-only";
import nodemailer from "nodemailer";

function configurationError() {
  const error = new Error("Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local.");
  error.status = 500;
  return error;
}

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw configurationError();
  return { from: user, transporter: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }) };
}

export async function sendEmail({ to, subject, text, html }) {
  const { from, transporter } = getTransport();
  return transporter.sendMail({ from, to, subject, text, html });
}
