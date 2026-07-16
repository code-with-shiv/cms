import { AxiosError } from "axios";

interface PydanticValidationError {
  loc?: (string | number)[];
  msg?: string;
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { detail?: string | PydanticValidationError[]; error?: string }
      | undefined;

    if (Array.isArray(data?.detail)) {
      const messages = data.detail.map((e) => e.msg).filter(Boolean);
      if (messages.length) return messages.join(" ");
    } else if (typeof data?.detail === "string") {
      return data.detail;
    }

    return data?.error ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
