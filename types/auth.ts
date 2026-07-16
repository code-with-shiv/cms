export type Role = "creator" | "reviewer" | "admin" | "superadmin";

export interface SessionUser {
  email: string;
  role: Role;
}

export interface MeResponse {
  email: string;
  role: Role;
}

export interface EmailLoginResponse {
  message: string;
  user: {
    email: string;
    role: Role;
  };
}

export interface GoogleLoginResponse {
  message: string;
  user: {
    email: string;
    username: string;
  };
}
