// Ô đếm + danh sách «Thu trước của đơn huỷ» trên Trang chủ Kế toán (ADR-0089 đ5 nhắc, đ9c «trong lúc chờ màn sổ, Trang chủ Kế toán có ô đếm», đ11; kế hoạch
// Đợt 1 NT-V6; đóng TNV-G1 28/10). Hàm THUẦN dùng ở web/home.ts. Số do máy chủ đếm (GET /api/ledger/coc/dem, GET /api/ledger/coc — `billing/coc.ts`); ở đây chỉ
// dựng chữ. Chữ dùng «thu trước», không «cọc» (chủ dự án 14/10). Số ngày nhắc: MỘT nguồn ở máy chủ (`nhacCoc`, billing/rules.ts); hai hằng dưới chỉ để in chữ,
// bài `thu-truoc-hien-thi.test.ts` khoá chúng bằng chính `nhacCoc` (khuôn `doi-chieu-hien-thi.ts`).
import type { CocListResponse } from "./contracts.ts";
import { can, holdsPartner, type PermissionHolder } from "./permissions.ts";

export const NGAY_NHAC_DUYET_HIEN_THI = 7;
export const NGAY_NHAC_HAN_HIEN_THI = 10;

/** Số của ô đếm (bản gọn của `CocDemResponse` sau `reviewAlerts`). */
export interface ThuTruocDem {
  canChi: number;
  qua7Ngay: number;
  sapHetHan: number;
  conNguoiGiu: number;
}

/** Danh sách có tên người giữ tiền (đ9b: chỉ `ledger.view` any) — không cho tài khoản giữ quyền Đối tác, kể cả lai (R-91, khuôn `coKhoiChoDoiChieu`). */
export const coKhoiThuTruoc = (s: PermissionHolder | null): boolean => !!s && can(s, "ledger.view") && !holdsPartner(s);

const HUONG_DAN_CHI = "Mở đơn rồi bấm “Ghi chi hoàn” hoặc “Chuyển tiền sang đơn mới”";

/** Dòng của khối «Cần xem lại»: mỗi số > 0 một dòng. */
export function dongThuTruoc(t: ThuTruocDem): { khoa: "canChi" | "sapHetHan" | "conNguoiGiu"; tieuDe: string; phu: string }[] {
  const out: { khoa: "canChi" | "sapHetHan" | "conNguoiGiu"; tieuDe: string; phu: string }[] = [];
  if (t.canChi > 0) {
    out.push({
      khoa: "canChi",
      tieuDe: `${t.canChi} khoản thu trước đã duyệt, chờ chi`,
      phu: t.qua7Ngay > 0 ? `${t.qua7Ngay} khoản đã duyệt quá ${NGAY_NHAC_DUYET_HIEN_THI} ngày · ${HUONG_DAN_CHI}` : HUONG_DAN_CHI,
    });
  }
  if (t.sapHetHan > 0) {
    out.push({ khoa: "sapHetHan", tieuDe: `${t.sapHetHan} đơn huỷ sắp hết hạn hoàn thu trước`, phu: `Còn ${NGAY_NHAC_HAN_HIEN_THI} ngày trở xuống · công ty định hoàn thì báo Quản trị duyệt trước hạn` });
  }
  if (t.conNguoiGiu > 0) {
    out.push({ khoa: "conNguoiGiu", tieuDe: `${t.conNguoiGiu} đơn huỷ còn người chưa nộp tiền`, phu: "Thu trước của đơn huỷ là tiền công ty · nhắc người giữ nộp về" });
  }
  return out;
}

/**
 * Danh sách dưới khối «Thu trước của đơn huỷ»: khoản đã duyệt chờ chi / chờ chuyển → đơn khách huỷ sắp hết hạn → đơn còn người chưa nộp. Đơn giữ tiền
 * chưa sắp hết hạn KHÔNG vào (không phải việc hôm nay); khoản đang đối chiếu thuộc khối «Chờ đối chiếu». Mỗi mục mở trang đơn — nơi có nút làm việc.
 */
export function danhSachThuTruoc(ds: CocListResponse, fmt: { tien: (n: number) => string; ngay: (iso: string) => string }): { orderId: string; maDon: string; chu: string; canhBao: string | null }[] {
  return [
    ...ds.canChi.map((k) => ({
      orderId: k.orderId,
      maDon: k.maDon,
      chu: `${k.loai === "chuyen" ? `chờ chuyển ${fmt.tien(k.conLai)} sang ${k.donNhan ?? "đơn mới"}` : `chờ chi hoàn ${fmt.tien(k.conLai)}`} · duyệt ngày ${fmt.ngay(k.ngayDuyet)}`,
      canhBao: k.qua7Ngay ? `quá ${NGAY_NHAC_DUYET_HIEN_THI} ngày` : null,
    })),
    ...ds.donHuyGiuCoc.filter((x) => x.sapHetHan).map((x) => ({ orderId: x.orderId, maDon: x.maDon, chu: `công ty còn giữ ${fmt.tien(x.conGiu)} · hạn hoàn ${fmt.ngay(x.han)}`, canhBao: "sắp hết hạn" })),
    ...ds.conNguoiGiu.map((g) => ({ orderId: g.orderId, maDon: g.maDon, chu: `${g.nguoi} chưa nộp ${fmt.tien(g.soTien)}`, canhBao: null })),
  ];
}
