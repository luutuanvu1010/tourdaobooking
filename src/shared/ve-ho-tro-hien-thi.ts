// Luật hiển thị THUẦN của trang Hỗ trợ (/feedback, ADR-0119 đợt 1): tab nào hiện, nhóm nào chọn được ở hàng đợi, khi nào hiện «Nhận việc», địa chỉ hàng đợi.
// Chỉ ẩn/hiện — máy chủ (quyenPhieu) luôn kiểm lại. Không I/O; bài ở ve-ho-tro-hien-thi.test.ts.
import type { FeedbackEventDto, FeedbackMessageDto, FeedbackMessagesSinceResponse, FeedbackMyOrdersResponse, FeedbackQueueResponse, FeedbackTeamsResponse, FeedbackTicketDto } from "./contracts.ts";
import { FEEDBACK_TRANSITIONS, type FeedbackStatus } from "./feedback-catalog.ts";
import { trangThaiHienThi } from "./order-status-label.ts";
import { PRIORITY_NAME, type LocHangDoi, type Priority } from "./ve-ho-tro.ts";

export type TabHoTro = "mine" | "queue" | "teams";

/** Tab hiện cho người xem: «Yêu cầu của tôi» luôn có; «Việc của nhóm» khi là thành viên một nhóm còn dùng hoặc Toàn quyền; «Quản lý nhóm» chỉ Toàn quyền. */
export function tabHoTro(t: FeedbackTeamsResponse): TabHoTro[] {
  const out: TabHoTro[] = ["mine"];
  if (t.isSuper || nhomHangDoi(t).length > 0) out.push("queue");
  if (t.isSuper) out.push("teams");
  return out;
}

/** Nhóm chọn được ở hàng đợi: Toàn quyền mọi nhóm đang dùng; thành viên chỉ nhóm mình thuộc (và nhóm đó còn dùng — `teams` chỉ gồm nhóm đang dùng). */
export function nhomHangDoi(t: FeedbackTeamsResponse): { id: string; name: string }[] {
  if (t.isSuper) return t.teams.map((x) => ({ id: x.id, name: x.name }));
  const cua = new Set(t.mine.map((m) => m.teamId));
  return t.teams.filter((x) => cua.has(x.id)).map((x) => ({ id: x.id, name: x.name }));
}

/** Phiếu coi như «chưa ai nhận»: chưa giao, hoặc người giữ đã bị khoá (ADR-0119 điều 8). */
export const chuaAiNhan = (t: Pick<FeedbackTicketDto, "assigneeId" | "assigneeActive">): boolean => !t.assigneeId || !t.assigneeActive;

/** Nút «Nhận việc»: phiếu chưa ai nhận, chưa đóng, và không phải phiếu chính người xem gửi (người gửi không xử lý phiếu mình — Review Focus 1). */
export function hienNhanViec(t: Pick<FeedbackTicketDto, "assigneeId" | "assigneeActive" | "submitterId" | "status">, staffId: string): boolean {
  return chuaAiNhan(t) && t.submitterId !== staffId && t.status !== "DONE" && t.status !== "DECLINED";
}

/** Địa chỉ hàng đợi một nhóm. `status`: một mã, hoặc danh sách (nối bằng dấu phẩy); rỗng ("" hay []) = bỏ tham số vì máy chủ trả 400 cho `status=` rỗng. `tim` rỗng cũng bỏ. */
export function duongHangDoi(team: string, loc: LocHangDoi, status: FeedbackStatus | "" | readonly FeedbackStatus[], tim?: string): string {
  const q = new URLSearchParams({ team, loc });
  const ds = typeof status === "string" ? (status ? [status] : []) : status;
  if (ds.length > 0) q.set("status", ds.join(","));
  if (tim && tim.trim()) q.set("q", tim.trim());
  return `/api/feedback/queue?${q.toString()}`;
}

/** Nhóm nhận khi chuyển: mọi nhóm đang dùng trừ nhóm đang giữ phiếu. */
export const nhomChuyenDuoc = (t: FeedbackTeamsResponse, dangGiu: string): { id: string; name: string }[] =>
  t.teams.filter((x) => x.id !== dangGiu).map((x) => ({ id: x.id, name: x.name }));

// ---- Đợt 2a (ADR-0127): tự làm mới khung trò chuyện ---------------------------------------------------------------------------------
/** Chu kỳ làm mới khi phiếu còn mở / đã đóng (đặc tả 2.1: đóng thì giảm, không dừng hẳn — người gửi trả lời sẽ mở lại phiếu). */
export const LAM_MOI_MO_MS = 5_000;
export const LAM_MOI_DONG_MS = 30_000;
/** Lùi mốc 30 giây: `created_at` do Worker tính TRƯỚC lô ghi, tin ghi xong sau có thể mang dấu giờ sớm hơn tin đã nhận (đặc tả 2.1). */
export const LAM_MOI_LUI_MS = 30_000;
/** Trần tin mỗi lần của tuyến làm mới — PHẢI bằng `MESSAGES_SINCE_LIMIT` của máy chủ (bài ghim ở src/modules/feedback/rules.test.ts). */
export const LAM_MOI_TRAN = 100;
/** Số lần «gọi tiếp ngay» liên tiếp tối đa trong một vòng (chặn vòng lặp nếu máy chủ trả bất thường). */
export const LAM_MOI_GOI_NGAY_TOI_DA = 10;

export const chuKyLamMoi = (status: FeedbackStatus): number => (status === "DONE" || status === "DECLINED" ? LAM_MOI_DONG_MS : LAM_MOI_MO_MS);

const iso = (ms: number): string => new Date(ms).toISOString();

/**
 * Gộp tin mới vào danh sách đang hiện: bỏ trùng theo `id` (bản mới thay bản cũ), xếp theo dấu giờ tăng dần; cùng dấu giờ thì giữ thứ tự đã có, tin mới sau
 * (sort của JS ổn định). Tin ghi xong muộn nhưng mang dấu giờ sớm hơn chen đúng chỗ thay vì nằm cuối.
 */
export function gopTin<T extends { id: string; createdAt: string }>(daCo: readonly T[], moi: readonly T[]): T[] {
  const theoId = new Map<string, T>();
  for (const m of daCo) theoId.set(m.id, m);
  for (const m of moi) theoId.set(m.id, m); // Map giữ vị trí chèn đầu tiên: bản mới của id cũ không đổi thứ tự
  return [...theoId.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/**
 * Một bước làm mới: gộp phản hồi vào danh sách và tính lời gọi kế.
 * - Mốc = dấu giờ LỚN NHẤT trong mọi tin máy chủ đã trả (không dùng đồng hồ trình duyệt), lùi 30 giây; chưa có tin thì lấy `macDinh` (giờ tạo phiếu) lùi 30 giây.
 * - Nhận ĐỦ trần trang ⇒ `goiNgay` với mốc là tin cuối của phản hồi, KHÔNG lùi (lùi thì nhận lại đúng 100 tin cũ và kẹt).
 * `moi` = tin chưa từng có trong `daCo` (để chỉ chèn phần tử mới, không dựng lại khung).
 */
export function buocLamMoi<T extends { id: string; createdAt: string }>(daCo: readonly T[], phanHoi: readonly T[], macDinh: string): { tin: T[]; moi: T[]; since: string; goiNgay: boolean } {
  const coSan = new Set(daCo.map((m) => m.id));
  const tin = gopTin(daCo, phanHoi);
  const moi = phanHoi.filter((m) => !coSan.has(m.id));
  const cuoi = phanHoi[phanHoi.length - 1];
  if (phanHoi.length >= LAM_MOI_TRAN && cuoi) return { tin, moi, since: iso(Date.parse(cuoi.createdAt)), goiNgay: true };
  const moc = tin.reduce((max, m) => Math.max(max, Date.parse(m.createdAt)), Number.NEGATIVE_INFINITY);
  const goc = Number.isFinite(moc) ? moc : Date.parse(macDinh);
  return { tin, moi, since: iso(goc - LAM_MOI_LUI_MS), goiNgay: false };
}

type DauPhieu = FeedbackMessagesSinceResponse["ticket"];
/** Phần đầu phiếu (trạng thái, người xử lý, mức ưu tiên, nhóm) có khác không — chỉ dựng lại khối đầu khi có đổi (không đóng ô chọn đang mở). */
export const dauPhieuDoi = (a: DauPhieu, b: DauPhieu): boolean =>
  a.status !== b.status || a.assigneeId !== b.assigneeId || a.assigneeName !== b.assigneeName || a.assigneeActive !== b.assigneeActive || a.priority !== b.priority || a.teamId !== b.teamId;

/** Người xử lý để hiện: chưa ai giữ; người giữ không còn hợp lệ (bị khoá hoặc rời nhóm — hiện tên mờ, phiếu coi như chưa ai nhận); đang giữ. */
export function nguoiXuLyHienThi(t: Pick<DauPhieu, "assigneeId" | "assigneeName" | "assigneeActive">): { kieu: "chua" | "cu" | "co"; ten: string | null } {
  if (!t.assigneeId) return { kieu: "chua", ten: null };
  return { kieu: t.assigneeActive ? "co" : "cu", ten: t.assigneeName ?? "?" };
}

/** Nhãn mức ưu tiên ở hàng đợi / danh sách: Thường không gắn nhãn (đỡ rối); `sac` chỉ dùng cho lớp CSS, không phải chữ hiển thị. */
export function huyHieuUuTien(p: Priority): { chu: string; sac: "cao" | "khan" } | null {
  if (p === "URGENT") return { chu: PRIORITY_NAME.URGENT, sac: "khan" };
  if (p === "HIGH") return { chu: PRIORITY_NAME.HIGH, sac: "cao" };
  return null;
}

/** Chữ một dòng trong ô «Đơn liên quan»: mã đơn + trạng thái bằng nhãn tiếng Việt (`trangThaiHienThi`), không lộ mã thô. */
export const nhanDonChon = (o: Pick<FeedbackMyOrdersResponse["orders"][number], "orderCode" | "status">): string => `${o.orderCode} · ${trangThaiHienThi({ status: o.status }).nhan}`;

// ---- PR 3 (trang Hỗ trợ thiết kế lại) ----------------------------------------------------------------------------------------------
export const CAU_MO_LAI = "Gửi sẽ mở lại yêu cầu này";
export const CAU_KHONG_CON_TRONG_NHOM = "Yêu cầu này không còn trong nhóm của bạn.";
export const CAU_DA_CHUYEN_NHOM = "Yêu cầu vừa được chuyển sang nhóm khác.";
export const NHAN_TAI_LAI = "Tải lại yêu cầu";
export const CAU_TU_CHOI_LOI_BUOC_2 = "Đã gửi lý do nhưng chưa đổi được trạng thái. Bấm Từ chối lại.";
export const NHAN_TAB: Record<TabHoTro, string> = { mine: "Yêu cầu của tôi", queue: "Việc của nhóm", teams: "Nhóm hỗ trợ" };

/** Các trạng thái được chuyển tới từ `status` (một nguồn với `canTransition`). */
export const buocChoPhep = (status: FeedbackStatus): FeedbackStatus[] => [...FEEDBACK_TRANSITIONS[status]];

/** Tin liền nhau cùng tác giả, cùng loại (công khai / nội bộ), cách tin liền trước ≤ 5 phút ⇒ một cụm. `luc` = giờ tin đầu cụm. */
export interface CumTin { tacGia: string; cuaToi: boolean; noiBo: boolean; luc: string; tin: FeedbackMessageDto[] }
const CUM_TOI_DA_MS = 5 * 60_000;
export function gomTin(ds: readonly FeedbackMessageDto[], cuaToi: string): CumTin[] {
  const out: CumTin[] = [];
  for (const m of ds) {
    const cuoi = out[out.length - 1];
    const truoc = cuoi?.tin[cuoi.tin.length - 1];
    if (cuoi && truoc && truoc.authorId === m.authorId && truoc.internal === m.internal && Date.parse(m.createdAt) - Date.parse(truoc.createdAt) <= CUM_TOI_DA_MS) {
      cuoi.tin.push(m);
      continue;
    }
    out.push({ tacGia: m.authorName ?? "?", cuaToi: m.authorId === cuaToi, noiBo: m.internal, luc: m.createdAt, tin: [m] });
  }
  return out;
}

/** Câu một dòng hệ thống trong luồng (chỉ ba loại; người gửi không xử lý không nhận sự kiện nên không có dòng này). */
export function cauSuKien(e: Pick<FeedbackEventDto, "loai" | "nguoi" | "den">): string {
  if (e.loai === "CLAIMED") return `${e.nguoi} đã nhận việc`;
  if (e.loai === "ASSIGNED") return `${e.nguoi} giao cho ${e.den ?? "?"}`;
  return `Chuyển sang nhóm ${e.den ?? "?"}`;
}

/** Chen dòng hệ thống vào giữa các cụm theo thời gian (sự kiện đến trước giờ đầu cụm nào thì đứng trước cụm đó). */
export function chenSuKien(cum: readonly CumTin[], suKien: readonly FeedbackEventDto[]): (CumTin | { suKien: FeedbackEventDto; cau: string })[] {
  const ev = [...suKien].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const out: (CumTin | { suKien: FeedbackEventDto; cau: string })[] = [];
  let i = 0;
  for (const c of cum) {
    while (i < ev.length && Date.parse(ev[i]!.at) < Date.parse(c.luc)) {
      out.push({ suKien: ev[i]!, cau: cauSuKien(ev[i]!) });
      i++;
    }
    out.push(c);
  }
  for (; i < ev.length; i++) out.push({ suKien: ev[i]!, cau: cauSuKien(ev[i]!) });
  return out;
}

/** Điền sẵn «Đơn liên quan» từ `?from=/order?id=<id>`: chỉ khi đúng trang đơn và đơn nằm trong danh sách đơn của người gửi. */
export function donDienSan(from: string | null, donCuaToi: readonly { id: string }[]): string | null {
  if (!from) return null;
  const m = /^\/order\?(.*)$/.exec(from);
  if (!m) return null;
  const id = new URLSearchParams(m[1]).get("id");
  return id && donCuaToi.some((d) => d.id === id) ? id : null;
}

const VN_MS = 7 * 3_600_000;
const hai = (n: number): string => String(n).padStart(2, "0");

/**
 * Số yêu cầu mới gửi tới nhóm trong tuần hiện tại (thứ Hai – Chủ nhật, giờ VN), cộng mọi loại / trạng thái. `stats.week` là strftime('%Y-%W') của máy chủ
 * (tuần bắt đầu thứ Hai, ngày 1/1 trước thứ Hai thuộc tuần 00). `tu` = «dd» của thứ Hai, `den` = «dd/mm» của Chủ nhật.
 */
export function demTuanNay(stats: FeedbackQueueResponse["stats"], now: Date): { tu: string; den: string; so: number } {
  const v = new Date(now.getTime() + VN_MS);
  const thuHai = (v.getUTCDay() + 6) % 7; // 0 = thứ Hai
  const dauNam = Date.UTC(v.getUTCFullYear(), 0, 1);
  const homNay = Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
  const yday = Math.round((homNay - dauNam) / 86_400_000);
  const tuan = Math.floor((yday + 7 - thuHai) / 7);
  const khoa = `${v.getUTCFullYear()}-${hai(tuan)}`;
  const so = stats.filter((s) => s.week === khoa).reduce((n, s) => n + s.count, 0);
  const thuHaiNgay = new Date(homNay - thuHai * 86_400_000);
  const chuNhat = new Date(homNay + (6 - thuHai) * 86_400_000);
  return { tu: hai(thuHaiNgay.getUTCDate()), den: `${hai(chuNhat.getUTCDate())}/${hai(chuNhat.getUTCMonth() + 1)}`, so };
}
export const cauTuanNay = (v: { tu: string; den: string; so: number }): string => `Tuần này (${v.tu}–${v.den}): ${v.so} yêu cầu mới gửi tới nhóm`;

/** Kết quả «Từ chối» hai bước. `buoc`: 0 = thiếu lý do (chưa gọi gì), 1 = gửi lý do lỗi (chưa đổi trạng thái), 2 = đổi trạng thái lỗi (lý do ĐÃ gửi). */
export type KetQuaTuChoi = { ok: true } | { ok: false; buoc: 0 | 1 | 2; loi?: unknown };

/**
 * Từ chối = (1) gửi tin lý do công khai, rồi (2) đổi trạng thái. Bước 1 chỉ chạy khi `daGui` chưa có `id`; gửi được thì đánh dấu NGAY, nên bước 2 lỗi rồi bấm lại
 * không gửi thêm tin lý do (đúng một tin trong luồng). Bước 1 lỗi ⇒ không làm bước 2. Xong cả hai ⇒ quên dấu (lần từ chối sau, khi yêu cầu được mở lại, hỏi lý do mới).
 */
export async function chayTuChoi(o: { id: string; lyDo: string; daGui: Set<string>; guiLyDo(): Promise<unknown>; doiTrangThai(): Promise<unknown> }): Promise<KetQuaTuChoi> {
  if (!o.daGui.has(o.id)) {
    if (!o.lyDo.trim()) return { ok: false, buoc: 0 };
    try {
      await o.guiLyDo();
    } catch (loi) {
      return { ok: false, buoc: 1, loi };
    }
    o.daGui.add(o.id);
  }
  try {
    await o.doiTrangThai();
  } catch (loi) {
    return { ok: false, buoc: 2, loi };
  }
  o.daGui.delete(o.id);
  return { ok: true };
}
