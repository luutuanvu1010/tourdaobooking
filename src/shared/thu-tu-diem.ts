// Luật THUẦN thứ tự điểm dừng của một chuyến (HT-01, kiểm theo vai 2/10 — lộ trình 3/10 V1.2; NGUYEN-NHAN-GOC.md §3.4). Không I/O; import kèm đuôi .ts.
// Test: thu-tu-diem.test.ts.
// - `sapDonTruocTra`: sau khi lệnh xếp / dời / cập nhật điểm dựng điểm (điểm trả dùng lại theo khoá nơi có thể đứng TRƯỚC điểm đón mới), sắp lại các điểm
//   CHƯA TỚI sao cho mọi điểm đón của một suất đứng trước điểm trả của suất đó, giữ thứ tự tương đối còn lại. Điểm đã tới / bỏ qua không đổi số.
// - `suatTraTruocDon`: suất (điểm lên + điểm xuống đều biết) có điểm xuống đứng trước HOẶC BẰNG số điểm lên (ADR-0096 Đ1.1, nghiêm ngặt). Lịch chung cảnh báo
//   `TRA_TRUOC_DON`; cổng xuất bến GIỮ bằng mã `TRA_TRUOC_DON` của `MA_GIU` (LC-19, `kiemXuatBen`) + trigger `vc_trip_departure_stop_order` (0084).
// - `daoMoiSauDoi`: suất bị đảo MỚI do một lệnh đổi số thứ tự (Đ1.3c) — lệnh đổi thứ tự / sửa điểm chuyến kế hoạch bị 409 khi khác rỗng.
// - `diemDonChuaToiCuaDiemTra`: điểm đón chưa tới của khách chờ lên sẽ xuống ở một điểm trả (Đ1.4) — "Đã tới" / "Đã trả" ở đó bị 409, giao diện ẩn nút.

export interface DiemThuTu {
  id: string;
  seq: number;
  /** Điểm CHƯA TỚI (`PENDING`) — chỉ điểm này được đổi số thứ tự (LC-15). */
  dangCho: boolean;
}
export interface SuatThuTu {
  diemLen: string | null;
  diemXuong: string | null;
}

/**
 * Số thứ tự MỚI của các điểm chưa tới cần đổi (id → seq; điểm giữ nguyên số không có trong kết quả). Sắp topo ổn định: lần lượt lấy điểm ĐẦU TIÊN (theo
 * thứ tự hiện tại) mà mọi điểm đón phải đứng trước nó đã được xếp — đồ thị chỉ có cạnh ĐÓN → TRẢ nên không có vòng, luôn xếp được. Gán lại đúng TẬP số cũ
 * của các điểm chưa tới (không chạm số của điểm đã tới / bỏ qua, không vượt giới hạn số). Ràng buộc có điểm không thuộc tập chưa tới bị bỏ qua.
 */
export function sapDonTruocTra(diem: readonly DiemThuTu[], suat: readonly SuatThuTu[]): Map<string, number> {
  const cho = diem.filter((x) => x.dangCho).sort((a, b) => a.seq - b.seq || a.id.localeCompare(b.id));
  const trongTap = new Set(cho.map((x) => x.id));
  const truoc = new Map<string, Set<string>>();
  for (const s of suat) {
    if (s.diemLen === null || s.diemXuong === null || s.diemLen === s.diemXuong) continue;
    if (!trongTap.has(s.diemLen) || !trongTap.has(s.diemXuong)) continue;
    const t = truoc.get(s.diemXuong) ?? new Set<string>();
    t.add(s.diemLen);
    truoc.set(s.diemXuong, t);
  }
  const conLai = [...cho];
  const daXep = new Set<string>();
  const thuTu: DiemThuTu[] = [];
  while (conLai.length > 0) {
    let i = conLai.findIndex((x) => [...(truoc.get(x.id) ?? [])].every((p) => daXep.has(p)));
    if (i < 0) i = 0; // không xảy ra (không vòng) — phòng thủ: giữ thứ tự cũ thay vì treo
    const [x] = conLai.splice(i, 1);
    daXep.add(x!.id);
    thuTu.push(x!);
  }
  const so = cho.map((x) => x.seq);
  const doi = new Map<string, number>();
  thuTu.forEach((x, i) => {
    if (x.seq !== so[i]) doi.set(x.id, so[i]!);
  });
  return doi;
}

/** Chỉ số (trong `suat`) của các suất có số điểm xuống ≤ số điểm lên theo số thứ tự hiện tại (ADR-0096 Đ1.1). Thiếu điểm → không tính. */
export function suatTraTruocDon(diem: readonly Pick<DiemThuTu, "id" | "seq">[], suat: readonly SuatThuTu[]): number[] {
  const seq = new Map(diem.map((x) => [x.id, x.seq]));
  const out: number[] = [];
  suat.forEach((s, i) => {
    const len = s.diemLen === null ? undefined : seq.get(s.diemLen);
    const xuong = s.diemXuong === null ? undefined : seq.get(s.diemXuong);
    if (len !== undefined && xuong !== undefined && xuong <= len) out.push(i);
  });
  return out;
}

/**
 * ADR-0096 Đ1.3c — chỉ số (trong `suat`) của các suất BỊ ĐẢO MỚI khi áp lệnh đổi số thứ tự `doi` (id → seq mới): sau lệnh vi phạm, trước lệnh không.
 * Diễn giải của người thi công (ghi ở báo cáo A1): suất đã đảo TỪ TRƯỚC lệnh không làm lệnh bị từ chối — để văn phòng / tài xế sửa dần bằng từng bước ↑ ↓
 * (một bước đổi chỗ hai điểm có thể chưa sửa hết). Cổng xuất bến (LC-19) vẫn chặn mọi suất còn đảo.
 */
export function daoMoiSauDoi(
  diem: readonly Pick<DiemThuTu, "id" | "seq">[],
  doi: readonly { id: string; seq: number }[],
  suat: readonly SuatThuTu[],
): number[] {
  const moi = new Map(doi.map((x) => [x.id, x.seq]));
  const sau = diem.map((x) => ({ id: x.id, seq: moi.get(x.id) ?? x.seq }));
  const truoc = new Set(suatTraTruocDon(diem, suat));
  return suatTraTruocDon(sau, suat).filter((i) => !truoc.has(i));
}

/** Suất cho luật "Đã tới" điểm trả (ADR-0096 Đ1.4). `mo` = suất còn mở (`valid_to_at IS NULL`). */
export interface SuatToiDiemTra extends SuatThuTu {
  trangThai: string;
  mo: boolean;
}

/**
 * ADR-0096 Đ1.4 (HT-02, HT-16) — id các điểm ĐÓN CHƯA TỚI (`PENDING`) của suất mở CHỜ LÊN (`WAITING`) có điểm xuống ở `diemTraId`, không trùng, theo thứ tự
 * gặp. Khác rỗng ⇒ "Đã tới" / "Đã trả" ở điểm trả đó bị từ chối (máy chủ) và ẩn nút (giao diện). Điểm đón đã tới (khách còn chờ đánh dấu) không chặn: tài xế
 * đánh dấu Vắng / Đã đón ở đó trước.
 */
export function diemDonChuaToiCuaDiemTra(
  diemTraId: string,
  diem: readonly { id: string; trangThai: string }[],
  suat: readonly SuatToiDiemTra[],
): string[] {
  const choToi = new Set(diem.filter((x) => x.trangThai === "PENDING").map((x) => x.id));
  const out: string[] = [];
  for (const s of suat) {
    if (!s.mo || s.trangThai !== "WAITING" || s.diemXuong !== diemTraId || s.diemLen === null) continue;
    if (choToi.has(s.diemLen) && !out.includes(s.diemLen)) out.push(s.diemLen);
  }
  return out;
}
