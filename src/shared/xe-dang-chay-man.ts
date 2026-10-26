// Luật hiển thị THUẦN của "Xe đang chạy" (Vận chuyển Đợt 5, ADR-0052 D5; bản vẽ docs/design/van-chuyen-dot-3-7/Điều phối xe đang chạy.dc.html — V11 văn phòng,
// V6 bổ sung màn tài xế). Không I/O, không DOM; import kèm đuôi .ts. Test: xe-dang-chay-man.test.ts.
// - Báo huỷ của văn phòng là THEO SUẤT và chỉ là cờ: suất vẫn chiếm chỗ tới khi tài xế bấm "Khách đã huỷ" (hoặc "Đã đón" khi báo nhầm).
// - Tài xế thấy giờ đón + TỔNG khách, không tách người lớn / trẻ em (lời chủ 5.3).
import type { CapNhatDiemResponse, ChangLichDto, ChuyenTomTatDto, CuuHoResponse, DeNghiDto, GioVnDto, LichChungResponse, XeNhanDto } from "./contracts.ts";
import { changChuaXep } from "./dieu-phoi-man.ts";
import { CAU_NHAC_XE_DANG_CHAY } from "./dong-bo-chuyen-cau.ts";
import { soKhachTaiDiem, type DiemVao, type SuatVao } from "./tien-do-man.ts";
import { maskLongDigits } from "./text-guards.ts";
import { msToVnLocal, ngayNgan } from "./vn-date.ts";

const hien = (g: GioVnDto, ngayXem: string): string => (g.ngay === ngayXem ? g.gio : `${g.gio} ${ngayNgan(g.ngay, ngayXem)}`);
const laKhach = (x: SuatVao): boolean => (x.loai ?? "PASSENGER") === "PASSENGER";

/** Chip trên một điểm dừng của chuyến đang chạy (V6 bảng 6.2): "Mới thêm" (điểm văn phòng thêm, chưa xong) + báo huỷ theo suất còn chờ ở điểm đón. */
export function chipDiemChay(d: DiemVao, suat: readonly SuatVao[]): { nhan: string; tone: "danger" | "warn" }[] {
  const chip: { nhan: string; tone: "danger" | "warn" }[] = [];
  const conViec = d.trangThai === "PENDING" || d.trangThai === "ARRIVED";
  if (d.themKhiChay && conViec) chip.push({ nhan: "Mới thêm", tone: "danger" });
  if (d.loai === "PICKUP") {
    const cho = suat.filter((x) => laKhach(x) && x.diemLen === d.id && x.trangThai === "WAITING");
    const baoHuy = cho.filter((x) => x.vanPhongBaoHuy).length;
    if (baoHuy > 0) chip.push({ nhan: baoHuy === cho.length ? "Văn phòng đã báo huỷ — vẫn tới điểm" : `${baoHuy}/${cho.length} khách văn phòng đã báo huỷ — vẫn tới điểm`, tone: "warn" });
  }
  return chip;
}

export interface KhachChoDong {
  suatId: string;
  ten: string;
  maDon: string | null;
  /** "Điểm N · nơi đón · giờ hẹn" (bản vẽ 11.2: "Suất 1 · Điểm 3 · Sân bay Cam Ranh"). */
  noiDon: string;
  /** Dòng đã báo huỷ (V11 bảng 11.2): nhãn chip + câu "vẫn chiếm chỗ"; null = chưa báo. */
  baoHuy: { nhan: string; phu: string } | null;
}
/**
 * "Khách đang chờ" của chuyến đang chạy (V11 bảng 11.2): suất khách còn chờ, theo thứ tự điểm đón. Tên che số dài. Không tên → "Khách i" đếm THEO ĐIỂM LÊN
 * (`soKhachTaiDiem`, một luật với thẻ điểm của `buocDiem` — cùng khách ở hai khối trên màn /chuyen phải ghi cùng số; trước 25/10 khối này đếm trên cả chuyến).
 */
export function khachDangCho(suat: readonly SuatVao[], diem: readonly DiemVao[], ngayXem: string): KhachChoDong[] {
  const theoId = new Map(diem.map((d) => [d.id, d]));
  const so = soKhachTaiDiem(suat);
  const thuTu = (x: SuatVao) => theoId.get(x.diemLen ?? "")?.thuTu ?? Number.MAX_SAFE_INTEGER;
  return suat
    .filter((x) => laKhach(x) && x.trangThai === "WAITING")
    .sort((a, b) => thuTu(a) - thuTu(b) || (a.maDon ?? "").localeCompare(b.maDon ?? "") || (a.hoTen ?? "").localeCompare(b.hoTen ?? "", "vi") || a.id.localeCompare(b.id))
    .map((x) => {
      const d = theoId.get(x.diemLen ?? "");
      const bh = x.vanPhongBaoHuy;
      return {
        suatId: x.id,
        ten: x.hoTen ? maskLongDigits(x.hoTen) : so.has(x.id) ? `Khách ${so.get(x.id)}` : "Khách",
        maDon: x.maDon ?? null, // khoá vắng (vế hạn ngoài khung — G-A4-7) → null, như "không có mã"
        noiDon: d ? [`Điểm ${d.thuTu}`, d.tenNoi, d.gioHen ? hien(d.gioHen, ngayXem) : null].filter(Boolean).join(" · ") : "—",
        baoHuy: bh ? { nhan: "Văn phòng đã báo huỷ", phu: `Vẫn chiếm chỗ cho đến khi tài xế xác nhận · ${hien(bh.luc, ngayXem)} · ${bh.lyDoNhan}` } : null,
      };
    });
}

/** Dải "Văn phòng vừa thêm điểm" của tài xế (V6 bảng 6.1): điểm thêm khi chạy, xe chưa tới, máy này chưa xem. Câu: "Điểm N · nơi · giờ · N khách". */
export function diemMoiChuaXem(diem: readonly DiemVao[], daXem: ReadonlySet<string>, ngayXem: string): { id: string; cau: string }[] {
  return [...diem]
    .filter((d) => d.themKhiChay && d.trangThai === "PENDING" && !daXem.has(d.id))
    .sort((a, b) => a.thuTu - b.thuTu)
    .map((d) => ({ id: d.id, cau: [`Điểm ${d.thuTu}`, d.tenNoi, d.gioHen ? hien(d.gioHen, ngayXem) : null, `${d.soNguoi} khách`].filter(Boolean).join(" · ") }));
}

/** Trang "Xe đang chạy" (V11 bảng 11.1): chuyến RUNNING của ngày, theo giờ bắt đầu. */
export function chuyenDangChay(l: Pick<LichChungResponse, "chuyen">): ChuyenTomTatDto[] {
  return l.chuyen.filter((c) => c.trangThai === "RUNNING").sort((a, b) => a.batDauMs - b.batDauMs);
}

/** Thẻ một xe đang chạy (V11 bảng 11.1): "mã" + "biển số · tải/số chỗ" + "tài xế · xuất bến HH:MM · tiếp theo: <điểm chưa tới đầu tiên>". */
export function theXeDangChay(c: ChuyenTomTatDto, ngayXem: string): { tieuDe: string; dong: string; phu: string } {
  const tiep = [...c.diem].filter((d) => d.trangThai === "PENDING").sort((a, b) => a.thuTu - b.thuTu)[0];
  return {
    tieuDe: c.ma,
    dong: `${c.xe.bienSo} · ${c.tai}/${c.xe.soCho} chỗ`,
    phu: [c.taiXe?.ten ?? "Chưa có tài xế", c.xuatBen ? `xe chạy ${hien(c.xuatBen.gioXayRa, ngayXem)}` : null, tiep ? `tiếp theo: ${tiep.tenNoi}` : "đã tới mọi điểm"].filter(Boolean).join(" · "),
  };
}

/**
 * ADR-0104 Đ2.7 (T2.16): dòng nhắc trên thẻ xe đang chạy — ĐÚNG câu cố định của máy (`CAU_NHAC_XE_DANG_CHAY`, cùng câu phản hồi lệnh đơn) khi máy chủ báo
 * chuyến còn khách chờ đón của đơn huỷ (`coKhachDonHuy`, tính lúc đọc). Không mã đơn, không tên.
 */
export const nhacXeDangChay = (c: Pick<ChuyenTomTatDto, "trangThai" | "coKhachDonHuy">): string | null =>
  c.trangThai === "RUNNING" && c.coKhachDonHuy ? CAU_NHAC_XE_DANG_CHAY : null;

export interface LuaChonThemDiem { legId: string; nhan: string; phu: string; noiDon: string; conLai: number; datGap: boolean }
/** Form "Thêm điểm đón / thêm khách" (V11 bảng 11.4): chặng chờ xếp; điểm đón chỉ đọc (suy từ chặng); số khách ≤ người còn lại của chặng. */
export function chonThemDiem(l: Pick<LichChungResponse, "chang">): LuaChonThemDiem[] {
  return changChuaXep(l)
    .filter((x) => x.conLai > 0)
    .map(({ chang: c, conLai }: { chang: ChangLichDto; conLai: number }) => ({
      legId: c.legId,
      nhan: `${c.maDon} · ${c.tenDichVu}`,
      phu: [c.gioDon, `còn ${conLai} người`, c.datGap ? "đặt gấp" : null].filter(Boolean).join(" · "),
      noiDon: [c.noiDon, c.gioDon].filter(Boolean).join(" · "),
      conLai,
      datGap: c.datGap,
    }));
}

/** Câu kết quả "Cập nhật điểm theo đơn" (V11 bảng 11.6): xe đang chạy có số khách bỏ qua; chuyến chưa chạy giữ câu cũ. */
export function cauCapNhatDiem(r: CapNhatDiemResponse, dangChay: boolean): { tone: "ok" | "info"; tieuDe: string; dong: string[] } {
  if (dangChay) {
    const boQua = r.boQua ?? 0;
    if (r.daCapNhat === 0 && boQua === 0) return { tone: "info", tieuDe: "Không có điểm nào cần cập nhật", dong: ["Khách còn chờ đã khớp nơi đón / trả của đơn."] };
    return { tone: "ok", tieuDe: `Đã cập nhật ${r.daCapNhat} · bỏ qua ${boQua} khách đã lên xe / điểm đã tới`, dong: ["Chỉ dời khách còn chờ ở điểm xe chưa tới. Tài xế nhận tin ngay."] };
  }
  return r.daCapNhat > 0
    ? { tone: "ok", tieuDe: "Đã cập nhật điểm theo đơn", dong: [`Đổi điểm cho ${r.daCapNhat} khách theo nơi đón / trả mới của đơn; điểm không còn khách chuyển “bỏ qua — không còn khách”.`] }
    : { tone: "info", tieuDe: "Không có điểm nào cần cập nhật", dong: ["Điểm dừng đã khớp các đơn trong chuyến."] };
}

/**
 * Khối "Cứu hộ" của văn phòng trên chuyến đã Kết thúc gián đoạn (bản vẽ CH.2 bản đơn giản — ADR-0052 D5c, lời chủ 5.2b): chặng cần chuyển theo giờ hẹn (chưa
 * có giờ đứng cuối); xe nhận = chuyến cùng ngày có tài xế công ty — còn chỗ trước, trong đó xe đang chạy trước; hết chỗ đứng cuối. Không km (không có dữ liệu
 * đường đi), không dòng xe nhà xe (đi "Tạo chuyến cứu hộ"). Không tên khách.
 */
export function theCuuHo(r: CuuHoResponse): { tieuDe: string; chang: string[]; xe: { tripId: string; nhan: string; phu: string }[] } {
  const n = r.chuyenHong.soKhachCanChuyen;
  const chang = [...r.changChoXep]
    .sort((a, b) => (a.gioHen ?? "99:99").localeCompare(b.gioHen ?? "99:99") || a.noiDon.localeCompare(b.noiDon, "vi") || a.legId.localeCompare(b.legId))
    .map((c) => [c.noiDon, c.gioHen, `${c.soNguoi} khách`, c.datGap ? "đặt gấp" : null].filter(Boolean).join(" · "));
  const hang = (x: CuuHoResponse["xeNhan"][number]) => (x.choTrong > 0 ? 0 : 2) + (x.trangThai === "RUNNING" ? 0 : 1);
  const xe = [...r.xeNhan]
    .sort((a, b) => hang(a) - hang(b) || a.maChuyen.localeCompare(b.maChuyen))
    .map((x) => ({
      tripId: x.tripId,
      nhan: `${x.maChuyen} · ${x.tenTaiXe}`,
      phu: [x.trangThai === "RUNNING" ? "Đang chạy" : "Chưa chạy", x.choTrong > 0 ? `còn ${x.choTrong} chỗ` : "hết chỗ", x.choTrong > 0 && x.diemSapToi ? `tiếp theo: ${x.diemSapToi}` : null]
        .filter(Boolean)
        .join(" · "),
    }));
  return { tieuDe: n > 0 ? `Cứu hộ ${r.chuyenHong.ma} · ${n} khách cần chuyển` : `Cứu hộ ${r.chuyenHong.ma} · không còn khách cần chuyển`, chang, xe };
}

/** Một dòng "Suất của khách" (bản vẽ V6 6.3 — ADR-0052 D5b): KHÔNG tên khách — chỉ điểm lên, số khách ở điểm đó, có tên hay chưa. */
export interface SuatTenDong {
  suatId: string;
  /** "Điểm M · Khách i · nơi". */
  nhan: string;
  /** "Điểm M · Khách i" — tiêu đề hộp "Bổ sung tên — …". */
  nhanNgan: string;
  coTen: boolean;
}
/**
 * Khối "Suất của khách" ở màn tài xế: chỉ trong ngày chạy (ngoài ngày chạy DTO không có tên để biết ai thiếu) và chỉ khi còn suất khách CHƯA có tên. Suất
 * khách còn chờ / đang trên xe, theo thứ tự điểm lên rồi thứ tự dòng khách; "Điểm M · Khách i · nơi". Người đi kèm, suất đã xong không tính.
 * 25/10 (đề xuất tài xế thấy khách trước khi cho xe chạy): bỏ cách đếm "Suất N" trên cả chuyến — dòng khách dưới thẻ điểm hiện cùng màn và đếm "Khách i" THEO
 * ĐIỂM, nên khối đếm đúng như thế (`soKhachTaiDiem`, một luật với `buocDiem`): khách chưa tên ở thẻ là "Khách 2" thì khối cũng ghi "Điểm M · Khách 2".
 */
export function suatCuaKhach(r: {
  trongNgayChay: boolean;
  diem: readonly { id: string; thuTu: number; tenNoi: string }[];
  suat: readonly { id: string; loai: "PASSENGER" | "CREW"; diemLen: string | null; trangThai: string; hoTen?: string }[];
}): { thieu: number; dong: SuatTenDong[] } | null {
  if (!r.trongNgayChay) return null;
  const diem = new Map(r.diem.map((d) => [d.id, d]));
  const so = soKhachTaiDiem(r.suat);
  const thu = (id: string | null) => (id ? (diem.get(id)?.thuTu ?? 9999) : 9999);
  const ds = r.suat
    .filter((s) => s.loai === "PASSENGER" && (s.trangThai === "WAITING" || s.trangThai === "BOARDED"))
    .sort((a, b) => thu(a.diemLen) - thu(b.diemLen) || (so.get(a.id) ?? 0) - (so.get(b.id) ?? 0) || a.id.localeCompare(b.id));
  const dong = ds.map((s) => {
    const d = s.diemLen ? diem.get(s.diemLen) : undefined;
    const nhanNgan = [d ? `Điểm ${d.thuTu}` : null, so.has(s.id) ? `Khách ${so.get(s.id)}` : "Khách"].filter(Boolean).join(" · ");
    return { suatId: s.id, nhan: [nhanNgan, d?.tenNoi ?? null].filter(Boolean).join(" · "), nhanNgan, coTen: s.hoTen !== undefined };
  });
  const thieu = dong.filter((x) => !x.coTen).length;
  return thieu > 0 ? { thieu, dong } : null;
}

// ---- Chuyển khách giữa hai xe (ADR-0111, ADR-0052 D4; bản vẽ "Điều phối xe đang chạy" V8, V9, V10 — gói A5 T13 / T14) -------------------------------------
// Đề nghị KHÔNG tên khách (LC-18): thẻ chỉ mã chuyến, tên điểm / nơi gặp (chữ đã che), số khách. Hạn chờ do MÁY CHỦ tính theo chính sách lúc gửi (`hanLuc`).
/** Đếm ngược "MM:SS" tới `hanLuc` (làm tròn LÊN giây còn lại); hết hạn → null. Màn gọi lại mỗi giây — đọc lại danh sách mới đổi trạng thái. */
export function demNguoc(hanLuc: string, bayGioMs: number): string | null {
  const con = Math.ceil((Date.parse(hanLuc) - bayGioMs) / 1000);
  if (!(con > 0)) return null;
  return `${String(Math.floor(con / 60)).padStart(2, "0")}:${String(con % 60).padStart(2, "0")}`;
}
/** V8 1: điểm có nút "Nhờ xe khác đón" — xe đang chạy, điểm đón chưa tới, có khách và mọi suất mở ở điểm là khách CHỜ (cùng luật gửi của máy chủ, LC-14). */
export function nhoDonDuoc(trangThaiChuyen: string, d: Pick<DiemVao, "id" | "loai" | "trangThai">, suat: readonly SuatVao[]): boolean {
  if (trangThaiChuyen !== "RUNNING" || d.loai !== "PICKUP" || d.trangThai !== "PENDING") return false;
  const o = suat.filter((x) => x.diemLen === d.id);
  return o.length > 0 && o.every((x) => laKhach(x) && x.trangThai === "WAITING");
}
export interface TheDeNghi {
  tieuDe: string;
  tone: "info" | "ok" | "bad" | "end" | "warn";
  dong: [string, string][];
  cau: string | null;
  /** Hiện đếm ngược tới `hanLuc`. */
  demNguoc: boolean;
  /** Xe nhờ: nút "Rút lại" (chỉ khi còn Chờ — Leo thang máy chủ không cho rút). */
  coRut: boolean;
  /** Xe nhờ: nút "Nhờ xe khác đón" lại (đề nghị đã đóng mà khách vẫn ở xe mình). */
  coNhoLai: boolean;
  /** Xe nhận: nút Nhận / Không nhận (chỉ khi còn Chờ, chưa quá hạn). */
  coNhan: boolean;
}
const noiCua = (d: DeNghiDto): [string, string] => (d.phamVi === "STOP" ? ["Điểm đón", d.tenDiem ?? "—"] : ["Nơi gặp", d.noiGap ?? "—"]);
const conCua = (d: DeNghiDto): string => (d.phamVi === "STOP" ? "Điểm vẫn thuộc chuyến của bạn." : "Khách vẫn thuộc chuyến của bạn.");
const lyDoCau = (d: DeNghiDto): string => (d.lyDo ? `Lý do: ${d.lyDo}. ` : "");
const the = (o: Partial<TheDeNghi> & Pick<TheDeNghi, "tieuDe" | "tone">): TheDeNghi => ({ dong: [], cau: null, demNguoc: false, coRut: false, coNhoLai: false, coNhan: false, ...o });
/** Thẻ đề nghị GỬI ĐI — màn xe nhờ (V8 4, 5). */
export function theGuiDi(d: DeNghiDto): TheDeNghi {
  const dong: [string, string][] = [noiCua(d), ["Số khách", String(d.soKhach)]];
  switch (d.trangThai) {
    case "PENDING":
      return the({ tieuDe: `Đang chờ ${d.denMaChuyen} nhận`, tone: "info", dong, demNguoc: true, coRut: true });
    case "HET_GIO":
    case "EXPIRED":
      return the({ tieuDe: "Đề nghị đã hết hạn", tone: "end", dong, cau: `Không ai trả lời kịp. ${conCua(d)}`, coNhoLai: true });
    case "DECLINED":
      return the({ tieuDe: `${d.denMaChuyen} không nhận`, tone: "bad", dong, cau: `${lyDoCau(d)}${conCua(d)}`, coNhoLai: true });
    case "CONFIRMED":
      return the({
        tieuDe: `${d.denMaChuyen} đã nhận`, tone: "ok", dong,
        cau: d.phamVi === "STOP" ? `Khách đã chuyển sang chuyến ${d.denMaChuyen}. Điểm không còn trong chuyến của bạn.` : `Khách đã chuyển sang chuyến ${d.denMaChuyen}. Xe nhận sẽ tới nơi gặp.`,
      });
    case "ESCALATED":
      return the({ tieuDe: "Chờ văn phòng duyệt", tone: "warn", dong, cau: "Đề nghị cần văn phòng duyệt. Bạn vẫn giữ khách đến khi có kết quả." });
    case "REJECTED":
      return the({ tieuDe: "Văn phòng không duyệt", tone: "bad", dong, cau: `${lyDoCau(d)}${conCua(d)}`, coNhoLai: true });
    case "WITHDRAWN":
      return the({ tieuDe: "Đã rút đề nghị", tone: "end", dong });
    case "VOID":
      return the({ tieuDe: "Đề nghị đã tự huỷ", tone: "end", dong, cau: "Điểm hoặc chuyến đã đổi nên đề nghị không còn dùng." });
  }
}
/** Thẻ đề nghị GỬI TỚI — màn xe nhận (V9 1, 3). */
export function theGuiToi(d: DeNghiDto): TheDeNghi {
  const dong: [string, string][] = [["Chuyến nhờ", d.tuMaChuyen], noiCua(d), ["Số khách", String(d.soKhach)]];
  switch (d.trangThai) {
    case "PENDING":
      return the({ tieuDe: "Đề nghị gửi tới bạn", tone: "info", dong, demNguoc: true, coNhan: true });
    case "HET_GIO":
    case "EXPIRED":
      return the({ tieuDe: "Đề nghị đã hết giờ chờ", tone: "end", dong });
    case "DECLINED":
      return the({ tieuDe: "Bạn đã không nhận", tone: "end", dong, cau: d.lyDo ? `Lý do: ${d.lyDo}.` : null });
    case "CONFIRMED":
      return the({ tieuDe: "Đã nhận — khách đã vào chuyến của bạn", tone: "ok", dong, cau: `${d.soKhach} khách từ chuyến ${d.tuMaChuyen} đã thêm vào chuyến của bạn.` });
    case "ESCALATED":
      return the({ tieuDe: "Chờ văn phòng duyệt", tone: "warn", dong, cau: "Khách chưa vào chuyến của bạn cho đến khi văn phòng duyệt." });
    case "REJECTED":
      return the({ tieuDe: "Văn phòng không duyệt", tone: "end", dong, cau: d.lyDo ? `Lý do: ${d.lyDo}.` : null });
    case "WITHDRAWN":
      return the({ tieuDe: "Xe nhờ đã rút đề nghị", tone: "end", dong });
    case "VOID":
      return the({ tieuDe: "Đề nghị đã tự huỷ", tone: "end", dong, cau: "Xe nhờ đã đổi (tới điểm, kết thúc…) nên đề nghị không còn dùng." });
  }
}
/** Một dòng xe nhận trong bảng chọn (V8 2); `du` = còn đủ chỗ cho `soKhach` (không đủ → khoá chọn; máy chủ vẫn kiểm lại). */
export function dongXeNhan(x: XeNhanDto, soKhach: number): { nhan: string; phu: string; cho: string; du: boolean } {
  return { nhan: `${x.maChuyen} · ${x.tenTaiXe}`, phu: x.diemSapToi ? `Sắp tới: ${x.diemSapToi}` : "Chưa có điểm sắp tới", cho: `Còn ${x.choTrong} chỗ`, du: x.choTrong >= soKhach };
}
const NHAN_TANG: Record<"LOI" | "CAU_HINH", string> = { LOI: "Bắt buộc", CAU_HINH: "Cấu hình" };
const NHAN_KET_QUA: Record<"DAT" | "KHONG_DAT" | "CANH_BAO", string> = { DAT: "Đạt", KHONG_DAT: "Không đạt", CANH_BAO: "Cảnh báo" };
const THU_KET_QUA: Record<"DAT" | "KHONG_DAT" | "CANH_BAO", number> = { KHONG_DAT: 0, CANH_BAO: 1, DAT: 2 };
/** Hộp duyệt của văn phòng (V10): dòng kiểm lần bấm gần nhất (không đạt / cảnh báo lên đầu) + nút. Bản vẽ viết "Luật lõi" — màn dùng "Bắt buộc" (chữ chờ chủ duyệt). */
export function hopDuyetDeNghi(d: DeNghiDto): {
  kiem: { nhan: string; tang: string; ketQua: string; dat: "DAT" | "KHONG_DAT" | "CANH_BAO" }[];
  coDuyet: boolean;
  coBac: boolean;
  cauChiBac: string | null;
} {
  const kiem = [...(d.kiem ?? [])]
    .sort((a, b) => THU_KET_QUA[a.ketQua] - THU_KET_QUA[b.ketQua])
    .map((k) => ({ nhan: k.nhan, tang: NHAN_TANG[k.tang], ketQua: NHAN_KET_QUA[k.ketQua], dat: k.ketQua }));
  const leo = d.trangThai === "ESCALATED";
  const chiBac = leo && d.hop === "CHI_BAC";
  return {
    kiem, coDuyet: leo && !chiBac, coBac: leo,
    cauChiBac: chiBac ? "Có điều kiện bắt buộc không đạt — văn phòng không phá lệ được. Chỉ có thể bác; tài xế xe nhờ sẽ nhận thông báo." : null,
  };
}
const TONE_VP: Record<DeNghiDto["trangThai"], "unit" | "ok" | "danger" | "muted" | "warn"> = {
  PENDING: "unit", HET_GIO: "muted", EXPIRED: "muted", WITHDRAWN: "muted", VOID: "muted", CONFIRMED: "ok", ESCALATED: "warn", DECLINED: "danger", REJECTED: "danger",
};
/** Một dòng đề nghị cho văn phòng (danh sách trong ngày — V10; khối đề nghị ở Chi tiết chuyến): chỉ đọc. `canDuyet` = đang Leo thang (nút ở màn duyệt). */
export function dongDeNghiVanPhong(d: DeNghiDto, ngayXem: string): {
  tieuDe: string;
  chip: { nhan: string; tone: "unit" | "ok" | "danger" | "muted" | "warn" };
  dong: [string, string][];
  canDuyet: boolean;
} {
  const g = msToVnLocal(Date.parse(d.guiLuc));
  return {
    tieuDe: `${d.tuMaChuyen} → ${d.denMaChuyen}`,
    chip: { nhan: d.nhanTrangThai, tone: TONE_VP[d.trangThai] },
    dong: [
      ["Loại", d.phamVi === "STOP" ? "Nhờ đón một điểm" : "Cứu hộ cả xe"], noiCua(d), ["Số khách", String(d.soKhach)], ["Gửi lúc", hien({ ngay: g.date, gio: g.time }, ngayXem)],
      ...(d.lyDo ? [["Lý do", d.lyDo] as [string, string]] : []),
    ],
    canDuyet: d.trangThai === "ESCALATED",
  };
}
