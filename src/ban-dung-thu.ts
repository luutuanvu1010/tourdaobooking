// BẢN DÙNG THỬ (ADR-0223) — phần có I/O. Gốc lắp ráp (src/index.ts) chỉ gọi vào đây khi `laBanDungThu(env)`; bản chính thức đi thẳng router như cũ.
// Ba việc: (1) cửa vào riêng (khoá / mở, chặn đăng ký, chặn sửa tài khoản dùng chung); (2) khoá đăng nhập dùng thử; (3) làm sạch mỗi 2 giờ.
// Luật thuần ở src/shared/ban-dung-thu.ts. Trạng thái khoá ở D1 THỨ HAI (`KHOA_DUNG_THU`), ngoài phần bị làm sạch (ADR-0223 Đ5).
import { currentStaff } from "./modules/auth";
import { mfaGraceIfNullStatement, setPinStatement } from "./modules/staff";
import { mfaGraceOnCreate } from "./modules/staff/rules";
import {
  CAU_DOC_DAU, DUONG_BAN_MAU, ID_DUNG_THU, ID_TOAN_QUYEN_DEMO, SDT_DUNG_THU, VAI_DUNG_THU, canLamMoi, choPhepLamMoi, docBanMau, laBanDungThu, loXoaHet, mocLamMoiKeTiep,
} from "./shared/ban-dung-thu";
import { error, json, readJson } from "./shared/http";
import { PERMISSION_LABEL } from "./shared/permissions";
import { normalizePhone } from "./shared/phone";
import { laToanQuyenThat } from "./shared/xem-nhu-vai";

type EnvDungThu = Env & {
  BAN_DUNG_THU?: string;
  KHOA_DUNG_THU?: D1Database;
  DUNG_THU_PIN?: string;
  DUNG_THU_PIN_TOAN_QUYEN?: string;
};

// ───────────────────────────── trạng thái khoá (D1 thứ hai) ─────────────────────────────
const TAO_BANG_KHOA = "CREATE TABLE IF NOT EXISTS dt_khoa (id INTEGER PRIMARY KEY CHECK (id = 1), khoa INTEGER NOT NULL CHECK (khoa IN (0, 1)), cap_nhat_luc TEXT NOT NULL, cap_nhat_boi TEXT)";
const DOC_KHOA = "SELECT khoa FROM dt_khoa WHERE id = 1";
const GHI_KHOA = "INSERT INTO dt_khoa (id, khoa, cap_nhat_luc, cap_nhat_boi) VALUES (1, ?1, ?2, ?3) ON CONFLICT (id) DO UPDATE SET khoa = excluded.khoa, cap_nhat_luc = excluded.cap_nhat_luc, cap_nhat_boi = excluded.cap_nhat_boi";

/** Đang khoá chưa. Thiếu D1 khoá ⇒ coi như KHOÁ (đóng cửa an toàn). */
export async function docKhoa(env: EnvDungThu): Promise<boolean> {
  const k = env.KHOA_DUNG_THU;
  if (!k) return true;
  const [, r] = await k.batch([k.prepare(TAO_BANG_KHOA), k.prepare(DOC_KHOA)]);
  const dong = (r?.results ?? [])[0] as { khoa?: number } | undefined;
  return dong?.khoa === 1;
}

async function ghiKhoa(env: EnvDungThu, khoa: boolean, boi: string): Promise<void> {
  const k = env.KHOA_DUNG_THU!;
  await k.batch([k.prepare(TAO_BANG_KHOA), k.prepare(GHI_KHOA).bind(khoa ? 1 : 0, new Date().toISOString(), boi)]);
}

// ───────────────────────────── cửa vào ─────────────────────────────
const KHOA_DANG_NHAP = (): Response => error(403, "ban_dung_thu_khoa", "Bản dùng thử đang tạm khoá. Liên hệ Tour Đảo để được mở lại.");
const DANG_KY_TAT = (): Response => error(403, "ban_dung_thu_dang_ky", "Bản dùng thử không mở đăng ký tài khoản.");
const TAI_KHOAN_CHUNG = (): Response => error(403, "ban_dung_thu_tai_khoan_chung", "Tài khoản dùng thử là tài khoản dùng chung, không đổi được.");
/** Route chọn vai (module accounts, nhóm tự phục vụ /api/account/*). */
export const DUONG_CHON_VAI = "/api/account/dung-thu-vai";
const LA_GHI = (m: string): boolean => m !== "GET" && m !== "HEAD" && m !== "OPTIONS";
const cungNguon = (request: Request, url: URL): boolean => {
  const o = request.headers.get("origin");
  return o ? o === url.origin : request.headers.get("sec-fetch-site") === "same-origin";
};

/** Thân trả cho trang đăng nhập (công khai): không có dữ liệu riêng của ai. */
export interface DungThuTrangThai { khoa: boolean; lamMoiLuc: string; sdtDungThu: string; vai: { code: string; nhan: string }[] }

/**
 * Cửa vào của bản dùng thử: xử lý đường riêng, chặn đường bị tắt, còn lại chuyển cho router `goc`.
 * Không thay router — mọi kiểm quyền, Origin, phiên của route thường vẫn chạy như bản chính thức.
 */
export async function fetchBanDungThu(request: Request, env: EnvDungThu, ctx: ExecutionContext, goc: (r: Request, e: Env, c: ExecutionContext) => Promise<Response>): Promise<Response> {
  const url = new URL(request.url);
  // Chuẩn hoá ĐÚNG như bộ định tuyến (`match` ở src/shared/router.ts): tách «/», bỏ đoạn rỗng — «//api/…», «/api//…» tới cùng route với «/api/…».
  // Đoạn chữ so nguyên (router không giải mã đoạn chữ); đoạn tham số (:id) router giải mã nên ở dưới cũng giải mã trước khi so (phát hiện C1, C2 của người kiểm 22/11).
  const doan = url.pathname.split("/").filter(Boolean);
  const p = "/" + doan.join("/");
  if (p.startsWith("/__ban-mau")) return error(404, "not_found", "Không tìm thấy.");

  if (p === "/api/dung-thu" && request.method === "GET") {
    const body: DungThuTrangThai = {
      khoa: await docKhoa(env), lamMoiLuc: mocLamMoiKeTiep(Date.now()), sdtDungThu: SDT_DUNG_THU,
      vai: VAI_DUNG_THU.map((code) => ({ code, nhan: PERMISSION_LABEL[code] })),
    };
    return json(body);
  }
  if (p === "/api/dung-thu/khoa" && request.method === "POST") {
    if (!cungNguon(request, url)) return error(403, "cross_origin", "Yêu cầu không đến từ trang của hệ thống.");
    const cur = await currentStaff(request, env, ctx);
    if (!cur) return error(401, "unauthorized", "Cần đăng nhập.");
    // Quyền THẬT Toàn quyền (không phải vai đang xem) — ADR-0223 Đ5.
    if (!laToanQuyenThat(cur.staff)) return error(403, "forbidden", "Chỉ Toàn quyền khoá / mở được bản dùng thử.");
    const khoa = (await readJson(request))?.khoa;
    if (typeof khoa !== "boolean") return error(400, "invalid_input", "Cần chọn khoá hay mở.");
    if (!env.KHOA_DUNG_THU) return error(503, "khoa_khong_co", "Bản dùng thử thiếu nơi giữ trạng thái khoá.");
    await ghiKhoa(env, khoa, cur.staff.id);
    return json({ khoa });
  }

  if (LA_GHI(request.method)) {
    if (p.startsWith("/api/dang-ky/") || p === "/api/dang-ky") return DANG_KY_TAT();
    if (p === "/api/auth/login") {
      const phone = normalizePhone(String((await readJson(request.clone()))?.phone ?? ""));
      if (phone === SDT_DUNG_THU && (await docKhoa(env))) return KHOA_DANG_NHAP();
    }
    if (p === "/api/auth/passkey/login" && (await docKhoa(env))) {
      // Tài khoản dùng thử không bật được Face ID (chặn ở /api/account/*), nên đăng nhập Face ID không bao giờ là tài khoản dùng thử; vẫn đóng khi khoá cho chắc.
      const cur = await currentStaff(request, env, ctx);
      if (cur?.staff.id === ID_DUNG_THU) return KHOA_DANG_NHAP();
    }
    // Tài khoản dùng thử không đổi gì của tài khoản dùng chung (PIN, Face ID, hai lớp…). Ngoại lệ duy nhất: chọn vai cho PHIÊN của chính mình.
    if (p.startsWith("/api/account/") && p !== DUONG_CHON_VAI) {
      const cur = await currentStaff(request, env, ctx);
      if (cur?.staff.id === ID_DUNG_THU) return TAI_KHOAN_CHUNG();
    }
    if (doan[0] === "api" && doan[1] === "staff" && doan[2] !== undefined) {
      let id = doan[2];
      try { id = decodeURIComponent(id); } catch { /* router cũng không khớp đoạn hỏng ⇒ 404 ở router */ }
      if (id === ID_DUNG_THU || id === ID_TOAN_QUYEN_DEMO) return TAI_KHOAN_CHUNG();
    }
  }
  // Phiên của tài khoản dùng thử khi đang khoá: kết thúc ngay ở lần gọi kế tiếp (không chờ hết hạn phiên).
  if (p.startsWith("/api/") && p !== "/api/auth/logout" && p !== "/api/auth/me") {
    // Chỉ đọc D1 khoá khi request mang phiên — trang công khai không tốn thêm câu nào.
    if (request.headers.get("cookie")?.includes("td_session=")) {
      const cur = await currentStaff(request, env, ctx);
      if (cur?.staff.id === ID_DUNG_THU && (await docKhoa(env))) return KHOA_DANG_NHAP();
    }
  }
  return goc(request, env, ctx);
}

// ───────────────────────────── làm sạch mỗi 2 giờ ─────────────────────────────
const PIN_HOP_LE = /^\d{6}$/;

export type KetQuaLamMoi = { ok: true; soCau: number; ms: number } | { ok: false; lyDo: string };

async function docTinh(env: EnvDungThu, duong: string): Promise<unknown> {
  const r = await env.ASSETS.fetch(new Request(`https://demo.invalid${duong}`));
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

/**
 * Xoá hết bảng, view rồi nạp bản mẫu + đặt PIN hai tài khoản từ bí mật trong MỘT lô (một giao dịch: hỏng thì về trạng thái trước — ADR-0223 Đ2.2).
 * Hai khoá an toàn (biến bật + bảng dấu) và D1 khoá phải có, thiếu một là từ chối, KHÔNG ghi gì (Đ2.3).
 */
/** Giá trị bảng dấu của D1 đang nối, hoặc null (bảng không có ⇒ không phải D1 dùng thử). Không ném. */
async function docDau(env: EnvDungThu): Promise<string | null> {
  try {
    const g = ((await env.DB.prepare(CAU_DOC_DAU).first()) as { gia_tri?: unknown } | null)?.gia_tri;
    return typeof g === "string" ? g : null;
  } catch {
    return null;
  }
}

export async function lamMoiBanDungThu(env: EnvDungThu, nowMs: number): Promise<KetQuaLamMoi> {
  const t0 = Date.now();
  const dau = await docDau(env);
  const cho = choPhepLamMoi({ bat: laBanDungThu(env), dau, coBangKhoa: !!env.KHOA_DUNG_THU });
  if (!cho.ok) return cho;
  const pin = env.DUNG_THU_PIN;
  const pinTq = env.DUNG_THU_PIN_TOAN_QUYEN;
  if (!pin || !PIN_HOP_LE.test(pin) || !pinTq || !PIN_HOP_LE.test(pinTq)) return { ok: false, lyDo: "thiếu bí mật PIN (DUNG_THU_PIN, DUNG_THU_PIN_TOAN_QUYEN)" };

  const banMau = docBanMau(await docTinh(env, DUONG_BAN_MAU));
  if (!banMau) return { ok: false, lyDo: "không đọc được bản mẫu" };
  const banThu = (await docTinh(env, "/ban-thu.json")) as { commit?: unknown } | null;
  if (banThu?.commit !== banMau.commit) return { ok: false, lyDo: "bản mẫu không cùng lần dựng với mã đang chạy" };

  const db = env.DB;
  const hien = ((await db.prepare("SELECT type, name FROM sqlite_master").all()).results ?? []) as { type: string; name: string }[];
  let xoa: string[];
  try { xoa = loXoaHet(hien); } catch (e) { return { ok: false, lyDo: e instanceof Error ? e.message : "tên lạ" }; }
  const at = nowMs;
  const lo = [
    ...[...xoa, ...banMau.cau].map((s) => db.prepare(s)),
    await setPinStatement(db, ID_DUNG_THU, pin, at),
    await setPinStatement(db, ID_TOAN_QUYEN_DEMO, pinTq, at),
    // Toàn quyền tạo lại mỗi lần ⇒ ân hạn hai lớp tính lại như tài khoản mới (ADR-0074 điều 1); bản mẫu để trống hạn.
    mfaGraceIfNullStatement(db, ID_TOAN_QUYEN_DEMO, mfaGraceOnCreate(["SUPER_ADMIN"], at)!),
  ];
  await db.batch(lo);
  return { ok: true, soCau: lo.length, ms: Date.now() - t0 };
}

/** Dọn mọi tệp trong các kho R2 của bản dùng thử (sau lô; hỏng thì lần sau dọn tiếp — dữ liệu vẫn dùng được). */
/**
 * Kho R2 trong env, nhận theo HÌNH DẠNG (có list / delete / put, không có prepare của D1) chứ không gọi tên binding: mỗi kho thuộc một module chủ và bài canh
 * kho tệp (src/kho-tep-*.test.ts) cấm nhắc tên kho ngoài module đó. Việc ở đây là dọn CẢ MÔI TRƯỜNG dùng thử (sau hai khoá an toàn), không phải nghiệp vụ của kho nào.
 */
const laKhoR2 = (v: unknown): v is R2Bucket => {
  const x = v as Record<string, unknown> | null;
  return typeof x === "object" && x !== null && typeof x.list === "function" && typeof x.delete === "function" && typeof x.put === "function" && typeof x.prepare !== "function";
};

async function donKhoTep(env: EnvDungThu): Promise<void> {
  for (const kho of Object.values(env as unknown as Record<string, unknown>).filter(laKhoR2)) {
    for (let vong = 0; vong < 20; vong++) {
      const ds = await kho.list({ limit: 1000 });
      if (!ds.objects.length) break;
      await kho.delete(ds.objects.map((o) => o.key));
      if (!ds.truncated) break;
    }
  }
}

/**
 * Lượt lịch chạy: đúng mốc giờ chẵn, hoặc D1 mang dấu chờ nạp (sau `len-demo`), thì làm mới + dọn kho. Gọi TRƯỚC các việc thường của lượt đó (đồng bộ danh
 * mục chạy sau, trên dữ liệu mới).
 */
export async function lamMoiNeuDenMoc(env: EnvDungThu, scheduledTime: number): Promise<void> {
  if (!laBanDungThu(env) || !canLamMoi(scheduledTime, await docDau(env))) return;
  const kq = await lamMoiBanDungThu(env, scheduledTime);
  console.log(JSON.stringify({ level: kq.ok ? "info" : "error", event: "ban_dung_thu_lam_moi", ...kq }));
  if (kq.ok) await donKhoTep(env).catch((e: unknown) => console.error(JSON.stringify({ level: "error", event: "ban_dung_thu_don_kho", message: e instanceof Error ? e.message : String(e) })));
}
