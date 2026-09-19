// Đích quay lại sau đăng nhập (`/login?next=…`). Logic thuần, dùng ở web/login.ts; có test.
// Chỉ nhận đường dẫn NỘI BỘ: bắt đầu bằng một "/" và chỉ gồm ký tự an toàn. Chặn "//evil.com" và "/\evil.com"
// (trình duyệt coi "\" như "/" → "https://evil.com/"), cùng mọi ký tự điều khiển/khoảng trắng.
const SAFE_PATH = /^\/(?![/\\])[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#]*$/;

export function safeNext(raw: string | null): string {
  return raw && !raw.includes("\\") && SAFE_PATH.test(raw) ? raw : "/";
}
