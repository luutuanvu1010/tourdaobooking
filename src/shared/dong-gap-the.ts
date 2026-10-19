// Thẻ dịch vụ GẬP của form Tạo/sửa đơn (thiết kế lại 18/10/2026; đặc tả docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md mục 3C, bản vẽ khung 4–6).
// Luật THUẦN (không DOM, import kèm đuôi .ts): chữ của dòng gập (số khách gọn, giờ + nơi đón), chip nền cát (thông tin còn thiếu + cảnh báo của thẻ mở), khi nào thẻ BỊ ÉP MỞ
// (lỗi chặn Lưu đang hiện) và khi nào thẻ của nháp vừa nạp phải MỞ SẴN (không giấu giá trị — luật "gập an toàn" của đợt bốn bước, đặc tả 2026-10-14 §2.4).
// Giao diện ở web/service-card.ts; "chỉ một thẻ mở" ở web/order-form.ts. Test: dong-gap-the.test.ts.
import { changNenGon, chiTietChangCoGiaTri, coOSoHieu, loiChang, nhanNoiChang, type ChangNhap } from "./chang-form.ts";
import { draftIssues, groupInfo, isLocked, previewLines, soKhachNhap, type ServiceDraft } from "./service-form.ts";
import { coGiaTriChuyen, tripWarnings, type TripWarning } from "./trip-form.ts";

/** Chip "đặt gấp" trên dòng gập: chặng có giờ đón dưới mốc tối thiểu mà chưa được duyệt đặt gấp (cùng điều kiện dải cảnh báo cuối thẻ — `canhBaoChangForm`). */
export const CHIP_DAT_GAP = "Cần đặt gấp";

/** Số khách gọn của dòng gập: chỉ loại có người, theo thứ tự Người lớn, Trẻ em, Người cao tuổi, Em bé — "2 NL · 1 TE · 1 EB". Không khách → "". */
export function soKhachGon(s: { nl: number; te: number; nc: number; eb: number }): string {
  return ([[s.nl, "NL"], [s.te, "TE"], [s.nc, "NCT"], [s.eb, "EB"]] as const)
    .filter(([n]) => n > 0)
    .map(([n, ten]) => `${n} ${ten}`)
    .join(" · ");
}

/**
 * Giờ + nơi đón của dòng gập: "đón 07:30 KS Biển Xanh" ("Khách sạn " ở đầu tên rút thành "KS " cho vừa khổ 390). Thiếu giờ → chỉ nơi ("đón KS Biển Xanh"), thiếu nơi → chỉ giờ;
 * KHÔNG ghép chữ "chưa chốt" vào đây (phần thiếu là chip riêng — `chipThieu`). Thiếu cả hai → null (dòng gập không in gì).
 * `ngayKhac` ("dd/mm", Việc 9 — nợ T5): chặng đón khác ngày khởi hành thì ghi ngày trước giờ ("đón 21/10 07:30 KS Biển Xanh") — gập thẻ không được giấu ngày đón khác ngày.
 */
export function donGon(gio: string | null, noi: string | null, ngayKhac: string | null = null): string | null {
  const g = (gio ?? "").trim();
  const n = (noi ?? "").trim().replace(/^Khách sạn\s+/u, "KS ");
  if (g === "" && n === "") return null;
  return ["đón", ngayKhac ?? "", g, n].filter((x) => x !== "").join(" ");
}

/** Ngày đón của chặng dạng "dd/mm" khi KHÁC ngày khởi hành (cả hai đã có); cùng ngày / thiếu ngày → null. */
const ngayDonKhac = (ngayDon: string, ngayDi: string): string | null => {
  if (ngayDon === "" || ngayDi === "" || ngayDon === ngayDi) return null;
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(ngayDon);
  return m ? `${m[2]}/${m[1]}` : null;
};

/** Chip thông tin còn thiếu hiện trên dòng gập: số khách (khi thiếu chặn Lưu — `coKhach`, mặc định có), rồi giờ / nơi đón của chặng. */
export function chipThieu(v: { coKhach?: boolean; coGioDon: boolean; coNoiDon: boolean }): string[] {
  return [...(v.coKhach === false ? ["Chưa nhập số khách"] : []), ...(v.coGioDon ? [] : ["Chưa chốt giờ đón"]), ...(v.coNoiDon ? [] : ["Chưa có nơi đón"])];
}

/** Chip của một câu cảnh báo thật (vd "Ngày khởi hành đã qua — vẫn lưu được, …"): phần trước " — ", bỏ dấu chấm cuối. Một nguồn chữ với dải cảnh báo của thẻ mở. */
export const chipTuCanhBao = (cau: string): string => (cau.split(" — ")[0] ?? cau).trim().replace(/\.$/u, "");

/**
 * Cảnh báo vàng (không chặn Lưu) của khối chuyến — dải `.svc-warnings` của thẻ mở VÀ chip của thẻ gập dùng chung hàm này. "Giờ đón sau giờ khởi hành": giờ đón nay ở chặng
 * (ADR-0047 Phần B) — so giờ của chiều đi SỚM NHẤT có giờ.
 */
export function canhBaoChuyenThe(d: ServiceDraft, today: string): TripWarning[] {
  const gioDi = d.legs.filter((l) => l.direction === "OUT" && l.pickupTime !== "").map((l) => l.pickupTime).sort()[0] ?? "";
  return tripWarnings({ ...d.trip, pickupTime: gioDi }, today);
}

/**
 * Thẻ có LỖI CHẶN LƯU ĐANG HIỆN → bị ép mở (kể cả khi đang có thẻ khác mở). Trước lần bấm Lưu đầu chỉ tính lỗi hiện ngay trên thẻ: "Tối đa 50 khách.", phải chọn lại từ danh mục,
 * và lỗi chặng báo ngay (số người chiều về quá số khách, số chỗ sai). "Chưa có nơi đón" / "Nhập số khách." chỉ hiện sau khi bấm Lưu (`daBamLuu`) — nên thẻ mới thêm còn trống vẫn gập được
 * khi thêm dịch vụ khác. Sau khi bấm Lưu: mọi lỗi chặn Lưu (`draftIssues`).
 */
export function coLoiChanLuuDangHien(d: ServiceDraft, daBamLuu: boolean): boolean {
  const loi = draftIssues(d);
  if (daBamLuu) return loi.length > 0;
  if (loi.some((i) => i.code === "too_many_guests" || i.code === "repick")) return true;
  const soKhach = soKhachNhap(d);
  return d.legs.some((l, i) => {
    const e = loiChang(l, i + 1, soKhach, false);
    return e.soVe !== null || e.choToiThieu !== null;
  });
}

/**
 * Thẻ của nháp vừa nạp (mở lại để sửa) có phải MỞ SẴN không: có lỗi chặn Lưu, hoặc bên trong có giá trị khác mặc định mà dòng gập không cho thấy — đúng các luật tự mở của khối
 * bên trong: Thông tin chuyến có giá trị (`coGiaTriChuyen`), chặng không gọn được một dòng (`changNenGon`: thiếu nơi đón, đón khác ngày, ô số hiệu chuyến bay, số người chiều về…),
 * chặng có xe riêng / xe tối thiểu (`chiTietChangCoGiaTri`). Còn lại gập (dòng gập đã nêu số khách, giờ + nơi đón, chip).
 */
export function theMoKhiNap(d: ServiceDraft, ngayDi: string, laSanBay: (id: string) => boolean): boolean {
  if (draftIssues(d).length > 0 || coGiaTriChuyen(d.trip)) return true;
  const soKhach = soKhachNhap(d);
  return d.legs.some((l, i) => chiTietChangCoGiaTri(l) || !changNenGon(l, i + 1, soKhach, ngayDi, coOSoHieu(l, laSanBay)));
}

/** Chặng nêu trên dòng gập: chiều đi đầu tiên; không có chiều đi thì chặng đầu. */
const changHien = (legs: readonly ChangNhap[]): ChangNhap | null => legs.find((l) => l.direction === "OUT") ?? legs[0] ?? null;

export interface DongGap {
  /** "2 NL · 1 TE · 1 EB" (theo khách) hoặc "7 khách" (theo nhóm, nhập tay); "" = chưa có khách. */
  khach: string;
  /** "đón 07:30 KS Biển Xanh"; null = không đưa đón / chưa có giờ lẫn nơi. */
  don: string | null;
  /** Chip nền cát: thiếu thông tin trước, cảnh báo sau, không lặp. */
  chips: string[];
}

/**
 * Nội dung dòng gập của một thẻ. `nhanTheoId` tra nhãn ngắn của điểm danh mục (như dòng tóm tắt chặng); `chipNgoai` = chip do trang tính (đặt gấp — mốc đọc ở trang).
 * Mọi cảnh báo mà thẻ MỞ đang hiện đều có chip ở đây — gập thẻ không được giấu cảnh báo.
 */
export function dongGapThe(d: ServiceDraft, o: { today: string; nhanTheoId: (id: string) => string | null; chipNgoai?: readonly string[] }): DongGap {
  let khach: string;
  if (d.kind === "catalog") {
    const g = groupInfo(d);
    khach = g ? (g.guests > 0 ? `${g.guests} khách` : "") : soKhachGon({ nl: d.pax.adult, te: d.pax.child, nc: d.pax.senior, eb: d.pax.infant });
  } else khach = d.guests > 0 ? `${d.guests} khách` : "";
  const l = changHien(d.legs);
  const noi = l ? nhanNoiChang(l.don, l.donTuDo, l.goc?.pickupLabel, o.nhanTheoId) : "";
  // "Chưa nhập số khách": đúng khi Lưu sẽ báo "Nhập số khách." (dịch vụ danh mục 0 khách); nhập tay không bắt buộc số khách. Chỉ hiện trên dòng gập — thẻ mở đã có ô số khách và câu lỗi.
  const coKhach = !draftIssues(d).some((i) => i.code === "no_guests");
  const chips: string[] = chipThieu({ coKhach, coGioDon: !l || l.pickupTime !== "", coNoiDon: !l || noi !== "" });
  if (d.kind === "catalog") {
    if (isLocked(d) || d.catalogStatus === "unavailable") chips.push("Dịch vụ đã ẩn khỏi danh mục");
    else if (d.catalogStatus === "price_changed") chips.push("Giá danh mục đã đổi");
    const p = previewLines(d);
    if (p.ok && p.lines.some((x) => x.deviation !== null)) chips.push("Khác giá danh mục");
  }
  chips.push(...canhBaoChuyenThe(d, o.today).map((w) => chipTuCanhBao(w.message)), ...(o.chipNgoai ?? []));
  return { khach, don: l ? donGon(l.pickupTime, noi, ngayDonKhac(l.pickupDate, d.trip.departDate)) : null, chips: [...new Set(chips)] };
}
