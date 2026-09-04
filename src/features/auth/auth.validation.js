export function validateCredentials({ email, password }) {
  if (!email?.trim() || !password) throw new Error("Email and password are required.");
}
