// Luật THUẦN của gộp hồ sơ cá nhân (ADR-0068 Đ1 bước 1–4, Đ2). Không I/O: route đọc hai hồ sơ + phần của module khác (qua ctx.gopHoSo) rồi gọi hàm này; bộ dựng
// lô (gop-lo.ts) biến kế hoạch thành câu lệnh. Dùng cho CẢ xem trước lẫn gộp thật (route gộp TÍNH LẠI, không tin xem trước). Không bao giờ chứa số giấy tờ.
// "Còn mở" = valid_to_date IS NULL hoặc > hôm nay (giờ VN) — dòng đóng đúng hôm nay coi là "vừa kết thúc" (kế hoạch R7).
// Hệ quả (phán quyết F16): các đường đọc cũ dùng `>= hôm nay`, nên dòng của A đóng đúng hôm nay vẫn hiện là hiệu lực trong ngày ở đó — chấp nhận được vì A bị ẩn sau khi gộp.

export type NhomVai = "INTERNAL" | "EXTERNAL" | "OTHER";
export interface LienHeGop { id: string; kind: string; value: string; valueNormalized: string; label: string | null; isPrimary: boolean; validFrom: string; validTo: string | null }
export interface CongViecGop { id: string; code: string; name: string; group: NhomVai; locationId: string | null; locationName: string | null; validFrom: string; validTo: string | null }
export interface QuanHeGop { id: string; typeCode: string; typeName: string; fromId: string; fromName: string; toId: string; toName: string; validFrom: string; validTo: string | null }
export interface GiayToGop { id: string; typeCode: string; typeName: string; className: string | null; previousId: string | null; voided: boolean; current: boolean }
export interface HoSoGop {
  id: string;
  kind: "PERSON" | "ORGANIZATION";
  displayName: string;
  active: boolean;
  mergedIntoId: string | null;
  laCongTyChu: boolean;
  coTaiKhoan: boolean;
  /** Đã có hồ sơ khác gộp VÀO hồ sơ này (ADR-0068 Đ3 — không chuỗi). */
  coHoSoTroVao: boolean;
  lienHe: LienHeGop[];
  congViec: CongViecGop[];
  quanHe: QuanHeGop[];
  giayTo: GiayToGop[];
}
/** Phần của module khác, gốc lắp ráp đếm (ctx.gopHoSo) — parties không đọc dsp_ / vc_ / orders. */
export interface NgoaiGop { phuTrachDon: number; laiChuyen: number; toLaiChuyen: number; chuXeChuyen: number; soXe: number; donLechTien: string[] }
export type MaChanGop =
  | "merge_same" | "merge_not_person" | "merge_inactive" | "merge_owner_company" | "merge_both_accounts" | "merge_source_has_account" | "merge_source_account_role"
  | "merge_role_group_conflict" | "merge_source_busy" | "merge_source_is_target" | "merge_source_future_row" | "merge_order_invalid" | "merge_source_owns_vehicle";
export interface LyDoChan { code: MaChanGop; message: string }
export interface KeHoachGop {
  chan: LyDoChan[];
  lienHe: { dong: LienHeGop[]; mo: { tu: LienHeGop; chinh: boolean }[]; bo: LienHeGop[] };
  congViec: { dong: CongViecGop[]; mo: CongViecGop[]; bo: { cv: CongViecGop; lyDo: "DA_CO" | "VUA_KET_THUC" }[] };
  quanHe: { dong: QuanHeGop[]; mo: { tu: QuanHeGop; fromId: string; toId: string }[]; chiDong: { qh: QuanHeGop; lyDo: "HAI_DAU_LA_MOT" | "DA_CO" | "VUA_KET_THUC" }[] };
  /** `huy` theo thứ tự PHẢI chạy (mới → cũ trong mỗi chuỗi gia hạn — trigger *_superseded). */
  giayTo: { huy: GiayToGop[]; chep: GiayToGop[]; giu: GiayToGop[] };
  /** Hồ sơ ở đầu kia của quan hệ bị chuyển / đóng — route xét cấp bậc từng hồ sơ (kế hoạch R4). */
  benThu3: string[];
}

const CAU: Record<Exclude<MaChanGop, "merge_source_busy" | "merge_order_invalid">, string> = {
  merge_same: "Hồ sơ phụ và hồ sơ chính phải là hai hồ sơ khác nhau.",
  merge_not_person: "Chỉ gộp được hai hồ sơ cá nhân (chưa gộp được hồ sơ tổ chức).",
  merge_inactive: "Một trong hai hồ sơ đã ngưng dùng hoặc đã gộp vào hồ sơ khác.",
  merge_owner_company: "Không gộp được hồ sơ công ty chủ.",
  merge_both_accounts: "Cả hai hồ sơ đều có tài khoản — không gộp được.",
  merge_source_has_account: "Hồ sơ phụ có tài khoản: hãy chọn hồ sơ có tài khoản làm hồ sơ chính.",
  merge_source_account_role: "Hồ sơ phụ đang giữ vai quyết định quyền đăng nhập (nội bộ hoặc bên ngoài) — kết thúc vai đó ở màn Quản lý tài khoản trước.",
  merge_role_group_conflict: "Sau khi gộp, hồ sơ chính sẽ vừa giữ vai nội bộ vừa giữ vai bên ngoài — không được.",
  merge_source_is_target: "Đã có hồ sơ khác gộp vào hồ sơ phụ này — hãy chọn nó làm hồ sơ chính (không gộp nối tiếp).",
  merge_source_future_row: "Hồ sơ phụ có công việc hoặc quan hệ bắt đầu sau hôm nay — kết thúc hoặc sửa dòng đó trước khi gộp.",
  merge_source_owns_vehicle: "Hồ sơ phụ đang đứng tên xe — đổi chủ xe ở mục Xe trước khi gộp.",
};
const chanCo = (code: keyof typeof CAU): LyDoChan => ({ code, message: CAU[code] });
const conMo = (validTo: string | null, homNay: string): boolean => validTo === null || validTo > homNay;
const cungNoi = (x: string | null, y: string | null): boolean => (x ?? "") === (y ?? "");

/** Thứ tự huỷ một nhóm giấy tờ cùng loại: luôn lấy dòng KHÔNG còn dòng gia hạn nào trong nhóm (mới nhất của chuỗi) trước. */
function thuTuHuy(ds: GiayToGop[]): GiayToGop[] {
  const con = [...ds].sort((x, y) => x.id.localeCompare(y.id));
  const ra: GiayToGop[] = [];
  while (con.length > 0) {
    const i = con.findIndex((r) => !con.some((x) => x.previousId === r.id));
    ra.push(con.splice(i === -1 ? 0 : i, 1)[0]!);
  }
  return ra;
}

export function keHoachGop(a: HoSoGop, b: HoSoGop, ngoai: NgoaiGop, homNay: string): KeHoachGop {
  const chan: LyDoChan[] = [];
  const ke: KeHoachGop = {
    chan,
    lienHe: { dong: [], mo: [], bo: [] },
    congViec: { dong: [], mo: [], bo: [] },
    quanHe: { dong: [], mo: [], chiDong: [] },
    giayTo: { huy: [], chep: [], giu: [] },
    benThu3: [],
  };
  if (a.id === b.id) {
    chan.push(chanCo("merge_same"));
    return ke;
  }

  // ---- Đ2: điều kiện ------------------------------------------------------------------------------------------------
  if (a.kind !== "PERSON" || b.kind !== "PERSON") chan.push(chanCo("merge_not_person"));
  if (!a.active || a.mergedIntoId !== null || !b.active || b.mergedIntoId !== null) chan.push(chanCo("merge_inactive"));
  if (a.laCongTyChu || b.laCongTyChu) chan.push(chanCo("merge_owner_company"));
  if (a.coTaiKhoan && b.coTaiKhoan) chan.push(chanCo("merge_both_accounts"));
  else if (a.coTaiKhoan) chan.push(chanCo("merge_source_has_account"));
  const vaiMoA = a.congViec.filter((r) => r.validFrom <= homNay && conMo(r.validTo, homNay));
  if (vaiMoA.some((r) => r.group !== "OTHER")) chan.push(chanCo("merge_source_account_role"));
  const nhomSau = new Set([...b.congViec.filter((r) => conMo(r.validTo, homNay)).map((r) => r.group), ...vaiMoA.map((r) => r.group)]);
  if (nhomSau.has("INTERNAL") && nhomSau.has("EXTERNAL")) chan.push(chanCo("merge_role_group_conflict"));
  const ban = [
    ngoai.phuTrachDon > 0 ? `phụ trách ${ngoai.phuTrachDon} đơn chưa xong` : null,
    ngoai.laiChuyen > 0 ? `lái ${ngoai.laiChuyen} chuyến chưa chốt` : null,
    ngoai.toLaiChuyen > 0 ? `đi kèm ${ngoai.toLaiChuyen} chuyến chưa chốt` : null,
    ngoai.chuXeChuyen > 0 ? `là nhà xe của ${ngoai.chuXeChuyen} chuyến chưa chốt` : null,
  ].filter((x): x is string => x !== null);
  if (ban.length > 0) chan.push({ code: "merge_source_busy", message: `Hồ sơ phụ đang có việc chưa xong: ${ban.join(", ")}. Đổi người trước khi gộp.` });
  if (a.coHoSoTroVao) chan.push(chanCo("merge_source_is_target"));
  // [Dừng Q5] — khuyến nghị: chặn dòng bắt đầu sau hôm nay (câu đóng dòng đòi ngày đóng ≥ ngày bắt đầu).
  if (a.congViec.some((r) => r.validFrom > homNay) || a.quanHe.some((x) => x.validFrom > homNay)) chan.push(chanCo("merge_source_future_row"));
  if (ngoai.donLechTien.length > 0) {
    chan.push({ code: "merge_order_invalid", message: `Đơn ${ngoai.donLechTien.join(", ")} của hồ sơ phụ đang lệch số tiền — sửa đơn trước khi gộp.` });
  }
  // [Dừng Q2] — khuyến nghị: chặn khi hồ sơ phụ đứng tên xe.
  if (ngoai.soXe > 0) chan.push(chanCo("merge_source_owns_vehicle"));

  // ---- Đ1 bước 1: liên hệ ---------------------------------------------------------------------------------------------
  const lhMoA = a.lienHe.filter((c) => conMo(c.validTo, homNay));
  const lhMoB = b.lienHe.filter((c) => conMo(c.validTo, homNay));
  ke.lienHe.dong = lhMoA;
  const daCoChinh = new Set(lhMoB.filter((c) => c.isPrimary).map((c) => c.kind));
  const trung = (x: LienHeGop, y: LienHeGop) => x.kind === y.kind && x.valueNormalized === y.valueNormalized;
  for (const c of [...lhMoA].sort((x, y) => Number(y.isPrimary) - Number(x.isPrimary))) {
    if (lhMoB.some((x) => trung(x, c)) || ke.lienHe.mo.some((m) => trung(m.tu, c))) {
      ke.lienHe.bo.push(c);
      continue;
    }
    const chinh = c.isPrimary && !daCoChinh.has(c.kind);
    if (chinh) daCoChinh.add(c.kind);
    ke.lienHe.mo.push({ tu: c, chinh });
  }

  // ---- Đ1 bước 2: công việc (chỉ nhóm OTHER được chuyển; nhóm tài khoản đã bị chặn ở trên) ------------------------------------------
  ke.congViec.dong = vaiMoA;
  for (const r of vaiMoA.filter((x) => x.group === "OTHER")) {
    const cung = b.congViec.filter((x) => x.code === r.code && cungNoi(x.locationId, r.locationId));
    if (cung.some((x) => conMo(x.validTo, homNay) || x.validFrom > homNay)) ke.congViec.bo.push({ cv: r, lyDo: "DA_CO" });
    else if (cung.some((x) => x.validTo === homNay)) ke.congViec.bo.push({ cv: r, lyDo: "VUA_KET_THUC" });
    else ke.congViec.mo.push(r);
  }

  // ---- Đ1 bước 3: quan hệ ----------------------------------------------------------------------------------------------
  const qhMoA = a.quanHe.filter((x) => x.validFrom <= homNay && conMo(x.validTo, homNay));
  ke.quanHe.dong = qhMoA;
  for (const x of qhMoA) {
    const khac = x.fromId === a.id ? x.toId : x.fromId;
    if (khac === b.id) {
      ke.quanHe.chiDong.push({ qh: x, lyDo: "HAI_DAU_LA_MOT" });
      continue;
    }
    if (!ke.benThu3.includes(khac)) ke.benThu3.push(khac);
    const fromId = x.fromId === a.id ? b.id : x.fromId;
    const toId = x.toId === a.id ? b.id : x.toId;
    const cung = b.quanHe.filter((y) => y.fromId === fromId && y.toId === toId && y.typeCode === x.typeCode);
    if (cung.some((y) => conMo(y.validTo, homNay) || y.validFrom > homNay)) ke.quanHe.chiDong.push({ qh: x, lyDo: "DA_CO" });
    else if (cung.some((y) => y.validTo === homNay)) ke.quanHe.chiDong.push({ qh: x, lyDo: "VUA_KET_THUC" });
    else ke.quanHe.mo.push({ tu: x, fromId, toId });
  }

  // ---- Đ1 bước 4 + Đ4: giấy tờ ----------------------------------------------------------------------------------------
  const theoLoai = new Map<string, GiayToGop[]>();
  for (const d of a.giayTo.filter((x) => !x.voided)) theoLoai.set(d.typeCode, [...(theoLoai.get(d.typeCode) ?? []), d]);
  for (const [loai, ds] of theoLoai) {
    if (b.giayTo.some((d) => d.typeCode === loai && d.current)) {
      ke.giayTo.giu.push(...ds);
      continue;
    }
    ke.giayTo.huy.push(...thuTuHuy(ds));
    ke.giayTo.chep.push(...ds.filter((d) => d.current));
  }
  return ke;
}
