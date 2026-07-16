import { apiClient } from "@/lib/axios";
import type {
  Assignment,
  AssignmentCreatePayload,
  AssignmentFilterParams,
  ReassignPayload,
} from "@/types/assignment";

const BASE = "/api/v2/assignments";

export async function createAssignment(
  payload: AssignmentCreatePayload,
): Promise<{ assignmentId: number }> {
  const { data } = await apiClient.post<{ assignment_id: number }>(`${BASE}/create`, payload);
  return { assignmentId: data.assignment_id };
}

export async function getAllAssignments(filters: AssignmentFilterParams = {}): Promise<Assignment[]> {
  const params: AssignmentFilterParams = {};
  if (filters.creator_email) params.creator_email = filters.creator_email;
  if (filters.reviewer_email) params.reviewer_email = filters.reviewer_email;
  if (filters.status) params.status = filters.status;

  const { data } = await apiClient.get<{ data: Assignment[] }>(`${BASE}/all`, { params });
  return data.data;
}

export async function getMyAssignments(): Promise<Assignment[]> {
  const { data } = await apiClient.get<{ data: Assignment[] }>(`${BASE}/my`);
  return data.data;
}

export async function completeAssignment(assignmentId: number): Promise<void> {
  await apiClient.patch(`${BASE}/${assignmentId}/complete`);
}

export async function reassignAssignment(
  assignmentId: number,
  payload: ReassignPayload,
): Promise<{ newAssignmentId: number }> {
  const { data } = await apiClient.post<{ new_assignment_id: number }>(
    `${BASE}/${assignmentId}/reassign`,
    payload,
  );
  return { newAssignmentId: data.new_assignment_id };
}
