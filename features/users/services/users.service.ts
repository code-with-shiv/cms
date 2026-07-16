import { apiClient } from "@/lib/axios";
import type { Role } from "@/types/auth";
import type { CreateUserPayload, ManagedUser } from "@/types/user";

export async function getAllUsers(): Promise<ManagedUser[]> {
  const { data } = await apiClient.get<{ data: ManagedUser[] }>("/get_all_users");
  return data.data;
}

export async function getUsersByRole(role: Role): Promise<ManagedUser[]> {
  const { data } = await apiClient.get<{ data: ManagedUser[] }>(`/get_users_by_role/${role}`);
  return data.data;
}

export async function createUser(payload: CreateUserPayload): Promise<{ tempPassword: string }> {
  const { data } = await apiClient.post<{ message: string; temp_password: string }>(
    "/create_user",
    payload,
  );
  return { tempPassword: data.temp_password };
}

export async function setUserPassword(email: string, password: string): Promise<void> {
  await apiClient.post(`/set_user_password/${encodeURIComponent(email)}`, { password });
}

export async function deleteUser(email: string): Promise<void> {
  await apiClient.delete(`/delete_user/${encodeURIComponent(email)}`);
}
