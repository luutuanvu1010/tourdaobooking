// ADR-0114 D2 (chủ duyệt 2026-10-13: "thể hiện đầy đủ tất cả các số dòng trước-trong-sau điều chỉnh, hiện đang bị thiếu dòng lúc khởi tạo") — dựng khối "Lịch sử số khách" của
// trang đơn. Luật thuần, không I/O, không import src/modules/ (giao diện cũng có thể dùng lại). Máy chủ (`GET /api/orders/:id`, module orders) đọc dữ liệu rồi gọi hàm này; hàm KHÔNG
// đọc chữ nhật ký và không cần migration: nguồn là số khách ĐÃ LƯU lúc xác nhận + các dòng điều chỉnh `order_money_adjustment` theo `seq`.
//
// HÌNH DÁNG ĐÃ CHỌN (ba dòng cho SV-SK-07 — đúng chữ ADR "4 người lớn, 3, 5"; không dùng bốn dòng):
//   khoi_tao   = trạng thái LÚC XÁC NHẬN (số khách đã lưu + tạm tính gốc);
//   dieu_chinh = mỗi lần sửa TRỪ lần cuối, mang `lanSua` = seq, là trạng thái SAU lần đó;
//   hien_hanh  = trạng thái hiện hành = kết quả lần sửa CUỐI (mang `lanSua` của lần đó); đơn chưa sửa lần nào thì `hien_hanh` trùng số `khoi_tao` và `lanSua` null.
// Mỗi dòng là một TRẠNG THÁI (số khách theo dịch vụ + tạm tính), không phải một cặp trước/sau; "trước và sau" đọc ra từ hai dòng liền nhau.
// Bài canh: lich-su-so-khach.test.ts (luật thuần) + src/modules/orders/lich-su-so-khach-route.test.ts (route thật, quyền).
import type { DongLichSuSoKhachDto } from "./contracts.ts";
import type { PaxCounts } from "./order-lines.ts";
import { DICH_VU_NHAP_TAY } from "./tin-doi-don.ts";

/** Một dịch vụ của đơn: số khách ĐÃ LƯU lúc xác nhận (`pax`). Dịch vụ không có mã danh mục là dịch vụ nhập tay — tên là chữ người dùng gõ nên KHÔNG đi vào dòng. */
export interface DichVuLichSu {
  id: string;
  catalogCode: string | null;
  name: string;
  pax: PaxCounts;
}

/**
 * Một lần sửa đã ghi: `sau` = số khách SAU lần đó của các dịch vụ danh mục (dịch vụ vắng — nhập tay, hay dòng hỏng — về số đã lưu, đúng cách đơn tính số hiện hành); `tamTinhSau` = tạm
 * tính sau lần đó do MÁY CHỦ tính bằng một nguồn (`effectiveSubtotal`) — không phải cột `subtotal_after` đã lưu (nơi ghi cũ từng lưu thiếu cho đơn có dịch vụ nhập tay).
 */
export interface LanSuaLichSu {
  seq: number;
  sau: readonly { serviceId: string; pax: PaxCounts }[];
  tamTinhSau: number;
}

export interface DauVaoLichSuSoKhach {
  dichVu: readonly DichVuLichSu[];
  tamTinhKhoiTao: number;
  lanSua: readonly LanSuaLichSu[];
}

const trangThai = (dichVu: readonly DichVuLichSu[], sau: ReadonlyMap<string, PaxCounts> | null): DongLichSuSoKhachDto["soKhach"] =>
  dichVu.map((s) => ({ tenDichVu: s.catalogCode !== null ? s.name : DICH_VU_NHAP_TAY, pax: { ...(sau?.get(s.id) ?? s.pax) } }));

export function dungLichSuSoKhach(v: DauVaoLichSuSoKhach): DongLichSuSoKhachDto[] {
  const lanSua = [...v.lanSua].sort((a, b) => a.seq - b.seq);
  const dong: DongLichSuSoKhachDto[] = [{ buoc: "khoi_tao", lanSua: null, soKhach: trangThai(v.dichVu, null), tamTinh: v.tamTinhKhoiTao }];
  if (lanSua.length === 0) return [...dong, { buoc: "hien_hanh", lanSua: null, soKhach: trangThai(v.dichVu, null), tamTinh: v.tamTinhKhoiTao }];
  lanSua.forEach((l, i) => {
    dong.push({
      buoc: i === lanSua.length - 1 ? "hien_hanh" : "dieu_chinh",
      lanSua: l.seq,
      soKhach: trangThai(v.dichVu, new Map(l.sau.map((s) => [s.serviceId, s.pax] as const))),
      tamTinh: l.tamTinhSau,
    });
  });
  return dong;
}
