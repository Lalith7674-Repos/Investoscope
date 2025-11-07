import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXTAUTH_SECRET || "admin-secret-change-in-production";

export async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token")?.value;

    if (!token) {
      return false;
    }

    const decoded = verify(token, ADMIN_SECRET) as any;
    return decoded.admin === true;
  } catch (e) {
    return false;
  }
}

