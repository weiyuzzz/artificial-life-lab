import type { ApiError } from "@/backend";
import type { TranslateFn } from "@/i18n";

type ApiErrorCode = ApiError["__kind__"] | "backendNotReady";

/** Error thrown by data hooks when a backend Result is `err`. */
export class ApiRequestError extends Error {
  readonly code: ApiErrorCode;
  readonly detail?: string;

  constructor(code: ApiErrorCode, detail?: string) {
    const messages: Record<ApiErrorCode, string> = {
      notFound: "The requested item was not found.",
      notAuthorized: "You are not authorized to perform this action.",
      invalidInput: `Invalid input: ${detail ?? ""}`,
      backendNotReady: "The backend is not ready yet. Please try again.",
    };
    super(messages[code]);
    this.name = "ApiRequestError";
    this.code = code;
    this.detail = detail;
  }
}

type BackendResult<T> =
  | { __kind__: "ok"; ok: T }
  | { __kind__: "err"; err: ApiError };

/** Unwraps a backend Result, throwing a readable ApiRequestError on `err`. */
export function unwrap<T>(result: BackendResult<T>): T {
  if (result.__kind__ === "ok") return result.ok;
  const { err } = result;
  if (err.__kind__ === "invalidInput")
    throw new ApiRequestError("invalidInput", err.invalidInput);
  throw new ApiRequestError(err.__kind__);
}

export function backendNotReady(): never {
  throw new ApiRequestError("backendNotReady");
}

/** Localized, readable message for any error surfaced by the data hooks. */
export function errorMessage(error: unknown, t: TranslateFn): string {
  if (error instanceof ApiRequestError) {
    if (error.code === "invalidInput")
      return t("error.invalidInput", { detail: error.detail ?? "" });
    if (error.code === "backendNotReady") return t("error.backendNotReady");
    return t(
      error.code === "notFound" ? "error.notFound" : "error.notAuthorized",
    );
  }
  const raw = error instanceof Error ? error.message : String(error);
  if (/unauthori[sz]ed/i.test(raw)) return t("error.notAuthorized");
  const rejectMatch = raw.match(/Reject text:\s*(.+)/i);
  return t("error.generic", {
    detail: (rejectMatch?.[1] ?? raw).slice(0, 200),
  });
}
