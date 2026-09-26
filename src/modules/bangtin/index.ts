// Module bangtin — BẢNG TIN (ADR-0022): báo tức thì "đơn vừa đổi" qua WebSocket tới mọi màn hình đang mở. Hạng KHONG_DB (không bảng, không SQL,
// không đọc cơ sở dữ liệu — architecture.test.ts): mã đơn, người lập, người phụ trách do GỐC LẮP RÁP (src/index.ts) đọc qua `orders`/`dispatch` rồi
// truyền vào `phatDon`. Module lá: không import module nào (ALLOWED_EDGES.bangtin = []).
//
// Lớp Durable Object (`./tram`) KHÔNG được import ở đây, kể cả chỉ lấy kiểu: tệp đó chỉ chạy trong Worker và chỉ src/index.ts được nạp nó
// (architecture.test.ts). Kiểu của stub đến từ `Env.BANG_TIN` (worker-configuration.d.ts).
import { nhanKetNoi, type SuKienDon } from "../../shared/bang-tin";
import { error, json } from "../../shared/http";
import { route, type AppModule } from "../../shared/router";
import { kiemOrigin } from "./rules";

/** Tên DUY NHẤT của trạm: một công ty, một trạm (ADR-0022) — vài chục nhân viên + đối tác, một trạm đủ sức, không cần chia nhỏ. */
const TEN_TRAM = "cong-ty";

export const bangtinModule: AppModule = {
  name: "bangtin",
  routes: [
    // Bắt tay WebSocket (BT-1). Router đã làm trước: đăng nhập (401) → cổng bảo trì (503). Ở đây: thiếu Upgrade → 426; Origin vắng/lạ → 403
    // (cùng mã + câu với cổng chống ghi chéo trang của router); trạm chưa có (khung thử không có binding) → 503. Rồi dựng MỚI yêu cầu gửi trạm chỉ
    // với ba header do máy chủ đặt — nhãn tính bằng can() ở máy chủ (NT-1), id người — KHÔNG chép header nào của trình duyệt (BT-2: header
    // `x-bang-tin-*` trình duyệt gửi lên bị bỏ). Trả NGUYÊN phản hồi của trạm (101 kèm đầu `webSocket`): bọc lại/dựng lại Response là mất kết nối.
    route("GET", "/api/bang-tin", "staff", async ({ request, env, url, staff }) => {
      if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
        return json({ error: { code: "upgrade_required", message: "Đường này chỉ dùng để mở kết nối nhận tin tức thì." } }, 426, { upgrade: "websocket" });
      }
      if (!kiemOrigin(request, url)) return error(403, "cross_origin", "Yêu cầu không đến từ trang của hệ thống.");
      if (!env.BANG_TIN) return error(503, "unavailable", "Bảng tin tạm thời chưa dùng được.");
      const nhan = nhanKetNoi(staff);
      const yeuCau = new Request("https://bang-tin/ket-noi", {
        headers: { upgrade: "websocket", "x-bang-tin-nhan": JSON.stringify(nhan), "x-bang-tin-nguoi": staff.id },
      });
      return env.BANG_TIN.getByName(TEN_TRAM).fetch(yeuCau);
    }),
  ],
};

/**
 * Phát một sự kiện đơn (đúng 5 khoá — ADR-0022 điều 4) tới các kết nối có ít nhất một nhãn trong `nhan` (NT-2, gốc lắp ráp tính bằng `nhanSuKien`).
 * Không có trạm (khung thử, `router.test.ts`) → không làm gì (DP-3). Lỗi ném ra được router bắt và ghi một dòng `bang_tin_loi` — không làm hỏng thao tác ghi.
 */
export async function phatDon(env: Env, suKien: SuKienDon, nhan: string[]): Promise<void> {
  if (!env.BANG_TIN) return;
  await env.BANG_TIN.getByName(TEN_TRAM).phat(suKien, nhan);
}

/** Đóng (mã 4003) các kết nối của một tài khoản (`{ staffId }`) hoặc MỌI kết nối (`"tat-ca"`, bật bảo trì) — KN-2. Không có trạm → không làm gì. */
export async function dongCua(env: Env, muc: { staffId: string } | "tat-ca"): Promise<void> {
  if (!env.BANG_TIN) return;
  await env.BANG_TIN.getByName(TEN_TRAM).dongCua(muc);
}
