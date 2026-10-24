/** Required server-only settings; never derived from database credentials. */
export function sessionSecret(): string {
  const value = process.env.SESSION_SECRET?.trim();
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  return value;
}

export function staffPin(): string {
  const value = process.env.STAFF_PIN?.trim();
  if (!value || !/^\d{6,}$/.test(value)) throw new Error('STAFF_PIN must contain at least 6 digits.');
  return value;
}
