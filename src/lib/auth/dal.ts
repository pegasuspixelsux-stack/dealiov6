import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { SessionPayload } from "@/types";
import { SESSION_COOKIE_NAME, decryptSession } from "./session";

export const verifySession = cache(
  async (): Promise<SessionPayload | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return decryptSession(token);
  }
);
