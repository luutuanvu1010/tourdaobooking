// Lỗi của navigator.credentials.create/get → câu cho người dùng (dùng chung web/login.ts, web/account.ts). null = người dùng tự huỷ: im lặng.
export function passkeyErrorMessage(e: unknown): string | null {
  const name = e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";
  if (name === "NotAllowedError" || name === "AbortError") return null;
  if (name === "InvalidStateError") return "Máy này đã bật Face ID cho tài khoản.";
  return "Không dùng được Face ID trên máy này. Hãy đăng nhập bằng PIN.";
}
