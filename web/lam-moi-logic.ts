// BẢNG TIN (ADR-0022, Task 9) — logic THUẦN cho các trang làm mới khi có tin (`don-thay-doi` / `can-tai-lai`): không đụng DOM/window (test bằng
// `node --test`, src/lam-moi-web.test.ts). Import kèm đuôi `.ts` vì Node chạy trực tiếp tệp này; esbuild/tsc của web/ chấp nhận.
import type { SuKienDon } from "../src/shared/bang-tin.ts";

/**
 * Bộ gộp lần tải (chống dồn đập, Review Focus #4): MỘT đợt tin và `can-tai-lai` ngay sau khi nối lại có thể đến gần nhau; trang không được chạy
 * hai lần tải CÙNG dữ liệu song song. Đang chạy mà có yêu cầu mới thì chỉ đánh dấu "chạy thêm một lần sau khi xong" (dữ liệu có thể đã đổi
 * SAU lúc lần tải hiện tại đọc, nên không bỏ hẳn); nhiều yêu cầu trong lúc chạy chỉ đổi thành MỘT lần chạy thêm. Lần tải ném lỗi không được làm
 * kẹt bộ gộp và không ném ra ngoài (nơi gọi tự xử lỗi hiển thị bên trong `tai`). Trả Promise xong khi cả cụm chạy xong (yêu cầu gộp vào cụm
 * đang chạy thì xong ngay).
 */
export function taoBoLamMoi(tai: () => Promise<void>): { yeuCau(): Promise<void> } {
  let dangChay = false;
  let chayThem = false;
  return {
    async yeuCau(): Promise<void> {
      if (dangChay) {
        chayThem = true;
        return;
      }
      dangChay = true;
      try {
        do {
          chayThem = false;
          try {
            await tai();
          } catch {
            // lỗi hiển thị do `tai` tự lo; bộ gộp chỉ giữ cho lần sau vẫn chạy được
          }
        } while (chayThem);
      } finally {
        dangChay = false;
      }
    },
  };
}

/** Trong đợt tin đã gộp có tin nào về đơn `orderId` không? */
export function suKienVeDon(ds: readonly SuKienDon[], orderId: string): boolean {
  return ds.some((e) => e.orderId === orderId);
}

/** Số dòng cần xin khi tải lại danh sách: đủ các dòng đang xem (sau "Tải thêm") nhưng không dưới một trang, không quá `toiDa` (máy chủ nhận tối đa 100). */
export function soDongCanTai(daTai: number, trang: number, toiDa: number): number {
  return Math.max(trang, Math.min(toiDa, daTai));
}

/** Có ô nhập nào đang khác giá trị lúc khối được dựng (`goc`)? Dùng cho khối có ô lý do/bộ đếm: chỉnh về lại số cũ thì không tính là "đã sửa". */
export function coODaSua(cacO: readonly { value: string; goc: string }[]): boolean {
  return cacO.some((o) => o.value !== o.goc);
}

/**
 * Có nên HOÃN làm mới một khối có ô nhập không? Đánh giá LÚC làm mới (không chốt cờ từ lần bấm trước — bấm rồi bỏ đi không được chặn làm mới mãi mãi):
 * hoãn khi con trỏ đang ở một ô nhập của khối, HOẶC có ô đã khác giá trị gốc, HOẶC hộp huỷ đang mở. Nơi gọi phải báo cho người dùng khi hoãn.
 */
export function nenHoanLamMoi(t: { dangGo: boolean; coODaSua: boolean; hopHuyMo: boolean }): boolean {
  return t.dangGo || t.coODaSua || t.hopHuyMo;
}
