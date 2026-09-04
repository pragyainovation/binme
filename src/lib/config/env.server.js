import "server-only";

export function requiredServerEnv(name, legacyNames = []) {
  const value = process.env[name] || legacyNames.map((legacyName) => process.env[legacyName]).find(Boolean);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
