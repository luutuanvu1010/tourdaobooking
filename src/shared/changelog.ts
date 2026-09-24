// Nhật ký thay đổi của ứng dụng (đặc tả docs/superpowers/specs/2026-09-23-nhat-ky-thay-doi-tro-giup-design.md). Thuần, không I/O.
// NGUỒN DUY NHẤT của số phiên bản: app-info.ts dẫn xuất APP_VERSION/APP_RELEASE_DATE từ mục đầu. Mỗi lần deploy mã mới = thêm MỘT mục vào ĐẦU mảng,
// số tăng 1 (1.N), lời thường cho nhân viên (công thức "Ghi nhật ký thay đổi" ở docs/CHANGE-GUIDE.md). changelog.test.ts chặn cách viết sai.
import { isISODate } from "./vn-date.ts";

export type ChangeKind = "moi" | "sua" | "doi";
export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = { moi: "Mới", sua: "Đã sửa", doi: "Thay đổi" };
export interface ChangeItem { readonly kind: ChangeKind; readonly text: string }
export interface ReleaseNote { readonly version: string; readonly date: string; readonly items: readonly ChangeItem[] }

/** Mới nhất ở ĐẦU. */
export const CHANGELOG: readonly ReleaseNote[] = [
  {
    version: "1.8",
    date: "2026-09-24",
    items: [
      { kind: "moi", text: "Quản trị viên gán vai cho từng tài khoản (Giám đốc, Kế toán, Hướng dẫn viên nội bộ, Cộng tác viên…); quyền tự theo vai, xem trước trước khi lưu." },
      { kind: "moi", text: "Thêm vai Thực tập sinh: lập đơn và chỉ thấy đơn của mình (chưa chọn được dịch vụ từ danh mục — chờ quyết định)." },
      { kind: "moi", text: "Tạo tài khoản cho người đã có hồ sơ (ví dụ khách cũ) mà không tạo hồ sơ trùng." },
      { kind: "doi", text: "Quyền \"Super Admin\" đổi tên thành \"Toàn quyền\". Chỉ Toàn quyền mới cấp được quyền Quản trị." },
    ],
  },
  {
    version: "1.7",
    date: "2026-09-24",
    items: [
      { kind: "sua", text: "Trang Đăng nhập trên điện thoại gọn hơn, hiện đủ trong một màn hình, không phải kéo, kể cả khi mở bằng Safari." },
    ],
  },
  {
    version: "1.6",
    date: "2026-09-24",
    items: [
      { kind: "doi", text: "Trang Đăng nhập có giao diện mới, gọn trong một màn hình, không cần kéo. Nút Đăng nhập chỉ bấm được khi đã gõ đủ số điện thoại và 6 số mã PIN." },
      { kind: "moi", text: "Nút Face ID / vân tay nằm ngay cạnh nút Đăng nhập. Ô mã PIN có nút Hiện để xem lại số vừa gõ và bộ đếm 0/6." },
      { kind: "doi", text: "Gõ sai mã PIN thì ô PIN tự xoá để gõ lại. Số hỗ trợ kỹ thuật 0989 929 373 hiện ngay dưới nút Đăng nhập." },
      { kind: "doi", text: "Tên ứng dụng đổi thành Island Booking System. App đã cài trên iPhone vẫn giữ tên cũ dưới biểu tượng tới khi cài lại." },
    ],
  },
  {
    version: "1.5",
    date: "2026-09-24",
    items: [
      { kind: "sua", text: "Đơn do Đối tác lập nay để trống người phụ trách, chờ nhân viên Tour Đảo nhận lo đơn, không còn tự ghi Đối tác làm người phụ trách." },
    ],
  },
  {
    version: "1.4",
    date: "2026-09-24",
    items: [
      { kind: "moi", text: "Trang Trợ giúp mới (ở trang Tôi và menu bên trái): xem app vừa đổi gì qua từng bản. Chấm đỏ nhỏ báo khi có bản mới mà bạn chưa xem." },
      { kind: "doi", text: "Mở app là vào thẳng Trang chủ. Danh sách đơn nay nằm ở mục Đơn hàng." },
      { kind: "doi", text: "Trên máy tính và iPad, menu chuyển sang cột dọc bên trái; cạnh mục Đơn hàng có số đơn chưa xác nhận." },
      { kind: "moi", text: "Ô tìm kiếm trên đầu trang (máy tính): gõ mã đơn, tên khách hoặc số điện thoại rồi bấm Enter để lọc danh sách đơn." },
      { kind: "moi", text: "Trang chủ có biểu đồ doanh thu từng ngày trong tuần của bạn (máy tính, iPad). Quản trị viên thấy thêm khối \"Cần xem lại\": Sheet đổi giá, góp ý chưa trả lời." },
      { kind: "sua", text: "Tài khoản Đối tác mở app được đưa thẳng tới danh sách đơn, không còn gặp báo lỗi ở Trang chủ." },
    ],
  },
  {
    version: "1.3",
    date: "2026-09-23",
    items: [
      { kind: "moi", text: "Đăng nhập bằng Face ID hoặc vân tay: bật một lần ở trang Tôi, lần sau chạm một cái là vào, không cần gõ số điện thoại và mã PIN." },
      { kind: "moi", text: "Quên mã PIN: đặt mã PIN mới ngay trên máy đã bật Face ID, không cần nhờ quản trị viên." },
      { kind: "doi", text: "Quản trị viên thấy ai đã bật Face ID và gỡ được khi cần. Ngưng tài khoản hoặc đặt lại mã PIN sẽ gỡ luôn Face ID của người đó." },
    ],
  },
  {
    version: "1.2",
    date: "2026-09-23",
    items: [
      { kind: "moi", text: "Trang chủ mới cho nhân viên văn phòng: đơn còn thiếu tiền, đơn nháp chưa xác nhận, đơn chưa có người phụ trách, chuyến đón hôm nay và doanh thu tuần." },
    ],
  },
  {
    version: "1.1",
    date: "2026-09-22",
    items: [
      { kind: "doi", text: "Giao diện mới cho các trang: dễ đọc hơn trên điện thoại, bố cục hai cột trên máy tính." },
      { kind: "moi", text: "Ghi được người đặt tour trên từng đơn." },
      { kind: "moi", text: "Hướng dẫn viên có mục \"Việc của tôi\" ở trang Tôi: sửa số khách hoặc huỷ đơn kèm lý do cho đơn đã xác nhận mà mình phụ trách." },
      { kind: "doi", text: "Quyền \"Thực hiện\" đổi tên thành \"Hướng dẫn viên\"." },
      { kind: "sua", text: "Sửa lỗi không tạo được tài khoản nhân viên mới." },
    ],
  },
  {
    version: "1.0",
    date: "2026-09-21",
    items: [
      { kind: "moi", text: "Lập đơn dịch vụ tour từ bảng giá chung, ghi thông tin chuyến cho từng dịch vụ và xác nhận đơn." },
      { kind: "moi", text: "Gửi ảnh xác nhận đơn cho khách; giao người phụ trách cho từng đơn." },
      { kind: "moi", text: "Đăng nhập bằng số điện thoại và mã PIN, có bước xác minh chống dò mã." },
      { kind: "moi", text: "Cài app lên màn hình chính điện thoại; gửi ý kiến cho quản trị viên ở mục Góp ý / Báo lỗi." },
    ],
  },
];

const VERSION_RE = /^(\d+)\.(\d+)$/;
function parseVersion(v: string): [number, number] | null {
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

/** Nhãn "Mới cập nhật" trên từng bản: chưa từng xem (hoặc rác) ⇒ chỉ bản mới nhất; đã xem X ⇒ mọi bản mới hơn X. */
export function isNewForViewer(version: string, seen: string | null, latest: string): boolean {
  if (seen === null || !parseVersion(seen)) return version === latest;
  return compareVersions(version, seen) > 0;
}

export const MAX_ITEM_LENGTH = 160;
const FORBIDDEN_WORDS = ["task", "commit", "api", "route", "migration", "worker", "deploy", "e2e", "d1", "null", "undefined"];
const FORBIDDEN_RE = new RegExp(`(^|[^\\p{L}\\p{N}_])(${FORBIDDEN_WORDS.join("|")})(?=$|[^\\p{L}\\p{N}_])`, "iu");
const SNAKE_RE = /[A-Za-z0-9]+_[A-Za-z0-9]+/;
const KINDS = new Set<string>(Object.keys(CHANGE_KIND_LABEL));

/** Mọi lỗi viết của nhật ký (rỗng = hợp lệ). Dùng ở changelog.test.ts. */
export function changelogProblems(log: readonly ReleaseNote[]): string[] {
  const out: string[] = [];
  if (log.length === 0) return ["Nhật ký rỗng: cần ít nhất một bản."];
  log.forEach((n, i) => {
    const at = `bản #${i} (${n.version})`;
    if (!parseVersion(n.version)) out.push(`${at}: số phiên bản không hợp lệ, cần dạng X.Y`);
    if (!isISODate(n.date)) out.push(`${at}: ngày không hợp lệ "${n.date}"`);
    if (n.items.length === 0) out.push(`${at}: cần ít nhất một gạch`);
    n.items.forEach((it, j) => {
      const t = it.text.trim();
      if (!KINDS.has(it.kind)) out.push(`${at} gạch ${j}: loại không hợp lệ "${it.kind}"`);
      if (!t) out.push(`${at} gạch ${j}: chữ rỗng`);
      if (t.length > MAX_ITEM_LENGTH) out.push(`${at} gạch ${j}: dài ${t.length} ký tự, tối đa ${MAX_ITEM_LENGTH}`);
      const bad = FORBIDDEN_RE.exec(t);
      if (bad) out.push(`${at} gạch ${j}: có chữ kỹ thuật "${bad[2]}"`);
      if (t.includes("`")) out.push(`${at} gạch ${j}: có dấu \``);
      if (SNAKE_RE.test(t)) out.push(`${at} gạch ${j}: có định danh kiểu snake_case`);
    });
    const next = log[i + 1];
    if (next && parseVersion(n.version) && parseVersion(next.version) && compareVersions(n.version, next.version) <= 0) out.push(`${at}: số phiên bản phải tăng dần nghiêm ngặt (mới nhất ở đầu), bản sau là ${next.version}`);
    if (next && isISODate(n.date) && isISODate(next.date) && n.date < next.date) out.push(`${at}: ngày ${n.date} sớm hơn bản cũ hơn (${next.date})`);
  });
  return out;
}

/** Cổng phát hành (scripts/kiem-phien-ban.mjs). "truoc": bản ở máy phải MỚI HƠN production; "sau": production phải BẰNG bản ở máy. remote null = production chưa báo số (coi là 1.0). */
export function releaseGate(local: string, remote: string | null, mode: "truoc" | "sau"): { ok: boolean; message: string } {
  const note = remote === null ? " (production chưa báo số phiên bản: coi là 1.0)" : "";
  const prod = remote ?? "1.0";
  if (!parseVersion(prod)) return { ok: false, message: `CHƯA ĐẠT: production trả số phiên bản lạ "${prod}".` };
  const cmp = compareVersions(local, prod);
  if (mode === "truoc") {
    return cmp > 0
      ? { ok: true, message: `ĐẠT: bản ở máy ${local} mới hơn production ${prod}${note}.` }
      : { ok: false, message: `CHƯA ĐẠT: bản ở máy ${local} không mới hơn production ${prod}${note}. Thêm mục mới vào đầu CHANGELOG (src/shared/changelog.ts).` };
  }
  return remote !== null && cmp === 0
    ? { ok: true, message: `ĐẠT: production đang chạy đúng bản ${local}.` }
    : { ok: false, message: `CHƯA ĐẠT: production báo ${prod}${note}, bản ở máy là ${local}.` };
}
