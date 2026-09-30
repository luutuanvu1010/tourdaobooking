// Bật thông báo trên điện thoại (ADR-0036): có nên huỷ subscription CŨ trước khi subscribe lại không. Thuần, không I/O.
// Chủ báo 30/9: "cứ mỗi lần triển khai lại bị tắt thông báo, phải bật thủ công". Điều tra (chỉ đọc) chưa chốt được nguyên nhân gốc; một phần chắc chắn:
// nút "Bật" LUÔN unsubscribe() rồi subscribe() ⇒ đổi địa chỉ (endpoint) mỗi lần bấm, dòng cũ trên máy chủ chết dần thành 410 `het-han`.
// Nay: cùng khoá VAPID ⇒ GIỮ subscription cũ (chỉ gửi lại địa chỉ lên máy chủ); khác khoá hoặc không đọc được khoá ⇒ huỷ trước như cũ
// (subscribe với applicationServerKey khác subscription đang có ném InvalidStateError).

function b64uSangBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** `khoaCu` = `subscription.options.applicationServerKey` (null nếu trình duyệt không cho biết); `khoa` = khoá VAPID công khai hiện hành (base64url). */
export function canHuyDangKyCu(khoaCu: ArrayBuffer | null, khoa: string): boolean {
  if (!khoaCu) return true;
  const a = new Uint8Array(khoaCu);
  const b = b64uSangBytes(khoa);
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
  return false;
}
