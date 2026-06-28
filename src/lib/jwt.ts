import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "diego_apple_store_secret_key_2026_xyz";

export function signToken(payload: { userId: string; role: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; email: string };
  } catch (error) {
    return null;
  }
}
