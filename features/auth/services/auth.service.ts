import { apiClient } from "@/lib/axios";
import type { EmailLoginResponse, GoogleLoginResponse, MeResponse } from "@/types/auth";

export async function loginWithGoogleToken(token: string): Promise<GoogleLoginResponse> {
  const { data } = await apiClient.post<GoogleLoginResponse>("/login", { token });
  return data;
}

export async function loginWithEmail(email: string, password: string): Promise<EmailLoginResponse> {
  const { data } = await apiClient.post<EmailLoginResponse>("/login/email", { email, password });
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/logout");
}

export async function fetchCurrentUser(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>("/me");
  return data;
}
