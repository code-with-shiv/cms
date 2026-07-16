import type { Role } from "@/types/auth";

export interface ManagedUser {
  name: string;
  email: string;
  role: Role;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: Role;
}
