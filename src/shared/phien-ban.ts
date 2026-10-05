// So sánh số phiên bản `X.Y` — luật thuần TÁCH khỏi nhật ký thay đổi (`changelog.ts`, ~63 KB và dày thêm sau mỗi bản phát hành) để giao diện chỉ nhập phần nhỏ này
// mà không kéo cả nhật ký vào gói của mọi trang (nghiên cứu tốc độ 2026-10-02; bài `src/goi-trang-nhe.test.ts` canh). `changelog.ts` xuất lại các hàm này.
const VERSION_RE = /^(\d+)\.(\d+)$/;

export function parseVersion(v: string): [number, number] | null {
  const m = VERSION_RE.exec(v);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** So hai số phiên bản `X.Y` theo SỐ (1.10 > 1.9). Sai dạng thì ném lỗi. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) throw new Error(`Số phiên bản không hợp lệ (cần dạng X.Y): "${pa ? b : a}"`);
  return pa[0] - pb[0] || pa[1] - pb[1];
}

/** Chấm đỏ: chưa từng xem, giá trị lưu là rác, hoặc đã xem bản cũ hơn ⇒ true. */
export function hasUnseenRelease(seen: string | null, current: string): boolean {
  if (seen === null || !parseVersion(seen)) return true;
  return compareVersions(seen, current) < 0;
}
