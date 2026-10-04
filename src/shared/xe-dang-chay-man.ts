// Luật hiển thị THUẦN của "Xe đang chạy" (Vận chuyển Đợt 5, ADR-0052 D5; bản vẽ docs/design/van-chuyen-dot-3-7/Điều phối xe đang chạy.dc.html — V11 văn phòng,
// V6 bổ sung màn tài xế). Không I/O, không DOM; import kèm đuôi .ts. Test: xe-dang-chay-man.test.ts.
// - Báo huỷ của văn phòng là THEO SUẤT và chỉ là cờ: suất vẫn chiếm chỗ tới khi tài xế bấm "Khách đã huỷ" (hoặc "Đã đón" khi báo nhầm).
// - Tài xế thấy giờ đón + TỔNG khách, không tách người lớn / trẻ em (lời chủ 5.3).
import type { CapNhatDiemResponse, ChangLichDto, ChuyenTomTatDto, GioVnDto, LichChungResponse } from "./contracts.ts";
import { changChuaXep } from "./dieu-phoi-man.ts";
import type { DiemVao, SuatVao } from "./tien-do-man.ts";
import { maskLongDigits } from "./text-guards.ts";
import { ngayNgan } from "./vn-date.ts";

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
  /** "Nơi đón · giờ hẹn". */
  noiDon: string;
  /** Dòng đã báo huỷ (V11 bảng 11.2): nhãn chip + câu "vẫn chiếm chỗ"; null = chưa báo. */
  baoHuy: { nhan: string; phu: string } | null;
}
/** "Khách đang chờ" của chuyến đang chạy (V11 bảng 11.2): suất khách còn chờ, theo thứ tự điểm đón. Không tên → "Khách N"; tên che số dài. */
export function khachDangCho(suat: readonly SuatVao[], diem: readonly DiemVao[], ngayXem: string): KhachChoDong[] {
  const theoId = new Map(diem.map((d) => [d.id, d]));
  const thuTu = (x: SuatVao) => theoId.get(x.diemLen ?? "")?.thuTu ?? Number.MAX_SAFE_INTEGER;
  return suat
    .filter((x) => laKhach(x) && x.trangThai === "WAITING")
    .sort((a, b) => thuTu(a) - thuTu(b))
    .map((x, i) => {
      const d = theoId.get(x.diemLen ?? "");
      const bh = x.vanPhongBaoHuy;
      return {
        suatId: x.id,
        ten: x.hoTen ? maskLongDigits(x.hoTen) : `Khách ${i + 1}`,
        maDon: x.maDon,
        noiDon: d ? [d.tenNoi, d.gioHen ? hien(d.gioHen, ngayXem) : null].filter(Boolean).join(" · ") : "—",
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
    phu: [c.taiXe?.ten ?? "Chưa có tài xế", c.xuatBen ? `xuất bến ${hien(c.xuatBen.gioXayRa, ngayXem)}` : null, tiep ? `tiếp theo: ${tiep.tenNoi}` : "đã tới mọi điểm"].filter(Boolean).join(" · "),
  };
}

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
