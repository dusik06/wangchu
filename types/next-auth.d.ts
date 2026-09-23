import type { DefaultSession } from "next-auth";
declare module "next-auth" { interface Session { user: DefaultSession["user"] & { id?: number; role?: string; dotori?: number }; } }
