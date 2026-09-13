function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

export function createPasswordResetEmail(resetUrl) {
  const safeUrl = escapeHtml(resetUrl);
  return {
    subject: "Reset your BinMe password",
    text: `We received a request to reset your BinMe password.\n\nReset your password: ${resetUrl}\n\nThis link is valid for 12 hours and can only be used once. If you did not request this, you can safely ignore this email.`,
    html: `<main style="max-width:600px;margin:0 auto;padding:32px;font-family:Arial,sans-serif;color:#17211f"><h1 style="margin:0 0 20px;font-size:24px">Reset your BinMe password</h1><p>We received a request to reset your password.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#16211f;color:#ffffff;text-decoration:none;font-weight:700">Reset password</a></p><p>This link is valid for <strong>12 hours</strong> and can only be used once.</p><p style="color:#53615f;font-size:14px">If you did not request this change, you can safely ignore this email.</p><p style="color:#53615f;font-size:14px">If the button does not work, use this link:<br><a href="${safeUrl}">${safeUrl}</a></p></main>`,
  };
}
