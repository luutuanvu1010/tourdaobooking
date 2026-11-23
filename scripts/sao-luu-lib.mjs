// Phần THUẦN của sao lưu hằng tuần (Đợt 2 sau kiểm toán, đặc tả docs/superpowers/specs/2026-11-16-dot-2-lay-lai-duoc-du-lieu.md) — không I/O, để
// src/sao-luu.test.ts kiểm: tên tệp sao lưu, chọn bản cần xoá (giữ 8 bản tuần gần nhất + bản mới nhất của mỗi tháng trong 12 tháng), và tham số mã hoá.

/** Khuôn tên tệp sao lưu. Chỉ tệp khớp khuôn này mới bị cân nhắc xoá — tệp khác trong thư mục đích không bao giờ bị đụng. */
export const KHUON_TEN = /^tourdao-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})\.tar\.gz\.enc$/;

/** Tên bản sao lưu theo giờ Việt Nam: tourdao-YYYYMMDD-HHMM (chưa đuôi). */
export function tenBan(now) {
  return `tourdao-${mocVn(now)}`;
}
/** Tên gói RIÊNG của kho Ảnh bàn giao (ADR-0232; chủ chọn giữ ít bản riêng 22/11/2026): tourdao-anh-ban-giao-YYYYMMDD-HHMM (chưa đuôi). */
export function tenBanAnh(now) {
  return `tourdao-anh-ban-giao-${mocVn(now)}`;
}
/** Kho sao lưu thành gói riêng, KHÔNG vào gói chính (khớp một mục của KHO_R2). */
export const KHO_ANH_RIENG = "tourdao-sales-anh-ban-giao";
/** Khuôn tên gói ảnh — không khớp KHUON_TEN của gói chính (và ngược lại), nên luật giữ của gói này không bao giờ xoá gói kia. */
export const KHUON_TEN_ANH = /^tourdao-anh-ban-giao-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})\.tar\.gz\.enc$/;
/**
 * Luật giữ gói ảnh: 4 gói gần nhất, không giữ theo tháng. Gói sao lưu chỉ để chống mất kho (ảnh vẫn nằm đủ hạn trong kho chính); giữ ít bản để (1) dung lượng
 * không nhân lên theo 20 bản như gói chính, (2) ảnh đã xoá theo yêu cầu không ở lại bản sao lưu quá khoảng một tháng (chính sách riêng tư nói thẳng con số này).
 */
export const GIU_ANH = { giuTuan: 4, giuThang: 0 };

/** YYYYMMDD-HHMM theo giờ Việt Nam. */
function mocVn(now) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}${p.month}${p.day}-${p.hour}${p.minute}`;
}

/** Đọc mốc của một tên tệp → { thang: "YYYY-MM", khoa: "YYYYMMDDHHMM", ngay: Date (UTC theo giờ VN) } hoặc null nếu không khớp khuôn. */
export function docTen(ten, khuon = KHUON_TEN) {
  const m = khuon.exec(ten);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return { thang: `${y}-${mo}`, khoa: `${y}${mo}${d}${h}${mi}`, ngay: new Date(`${y}-${mo}-${d}T${h}:${mi}:00+07:00`) };
}

/**
 * Chọn tệp cần xoá. Giữ: `giuTuan` bản mới nhất; và bản mới nhất của mỗi tháng trong `giuThang` tháng gần nhất (tính theo các tháng CÓ bản).
 * Không bao giờ xoá bản mới nhất. Tệp không khớp khuôn bị bỏ qua (không xoá).
 */
export function chonXoa(tenTep, { giuTuan = 8, giuThang = 12, khuon = KHUON_TEN } = {}) {
  const ban = tenTep.map((t) => ({ t, x: docTen(t, khuon) })).filter((b) => b.x).sort((a, b) => (a.x.khoa < b.x.khoa ? 1 : -1));
  const giu = new Set(ban.slice(0, giuTuan).map((b) => b.t));
  const thangDaGiu = [];
  for (const b of ban) {
    if (thangDaGiu.includes(b.x.thang)) continue;
    if (thangDaGiu.length >= giuThang) break;
    thangDaGiu.push(b.x.thang);
    giu.add(b.t);
  }
  return ban.filter((b) => !giu.has(b.t)).map((b) => b.t);
}

/** Số ngày từ bản mới nhất tới `now`; Infinity khi chưa có bản nào. Dùng cho chạy bù: lịch chạy hằng ngày, chỉ sao lưu khi bản mới nhất đủ cũ. */
export function soNgayTuBanMoiNhat(tenTep, now) {
  const moc = tenTep.map((t) => docTen(t)).filter(Boolean).map((x) => x.ngay.getTime());
  if (moc.length === 0) return Infinity;
  return (now.getTime() - Math.max(...moc)) / 86_400_000;
}

/** Tham số openssl chung cho mã hoá và giải mã (một nguồn — lệch là tệp không mở được). Mật khẩu đi qua biến môi trường của tiến trình con, không qua dòng lệnh. */
export const BIEN_MAT_KHAU = "TOURDAO_SAO_LUU_MK";
export const THAM_SO_OPENSSL = ["enc", "-aes-256-cbc", "-pbkdf2", "-iter", "600000", "-md", "sha256", "-pass", `env:${BIEN_MAT_KHAU}`];

/** Ba tệp D1 nạp lại được (thứ tự nạp: cấu trúc → dữ liệu → trigger — docs/superpowers/specs/2026-09-22-dien-tap-khoi-phuc.md §1). */
export const TEP_D1 = ["d1/cau-truc.sql", "d1/du-lieu.sql", "d1/trigger.sql"];

/** Sáu kho tệp R2 (khớp r2_buckets ở wrangler.jsonc — src/sao-luu.test.ts đỏ khi lệch). Kho KHO_ANH_RIENG đi gói riêng (scripts/sao-luu.mjs bước 2b). */
export const KHO_R2 = ["tourdao-sales-ho-so", "tourdao-sales-ho-tro", "tourdao-sales-ve-dien-tu", "tourdao-sales-bien-lai", "tourdao-sales-anh-dich-vu", "tourdao-sales-anh-ban-giao"];

/** Tên mục trong Keychain của macOS giữ mật khẩu mã hoá (chủ tạo một lần; xem docs/KHOI-PHUC-DU-LIEU.md). */
export const KEYCHAIN = { dichVu: "tourdao-sao-luu", taiKhoan: "tourdao" };

/** Năm con số so production khi diễn tập (chỉ đếm). */
export const CAU_DEM =
  "SELECT (SELECT count(*) FROM orders) AS don, (SELECT count(*) FROM order_item) AS dong_tien, (SELECT count(*) FROM staff) AS tai_khoan, (SELECT count(*) FROM pty_party) AS ho_so, (SELECT count(*) FROM audit_log) AS nhat_ky";
