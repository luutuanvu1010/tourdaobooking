// Mục «Hồ sơ tổ chức» ở trang Tôi (ADR-0213 Đ6, Đ7.4; mốc B1 Task 14, B2 Task 17): lối vào màn của người quản lý — mỗi tổ chức bạn đang quản lý một dòng; tổ chức bạn là thành viên
// chỉ ghi tên (màn người quản lý không mở cho thành viên); lời mời vào tổ chức gửi tới số đăng nhập của chính bạn kèm nút «Nhận»; ô nhập mã vào tổ chức.
// Danh sách do máy chủ trả (`GET /api/to-chuc/cua-toi`, `GET /api/to-chuc/loi-moi-cua-toi`); không có gì để hiện ⇒ mục giữ ẩn; lỗi ⇒ phần đó bỏ qua (không chặn trang).
// «Nhận» đi qua `api()` — route nhận nằm trong danh sách route bí mật của lớp chống ghi trùng (vé chỉ trong bộ nhớ trang). Không innerHTML.
import { ApiError, api, type Api, type Staff } from "./api";
import { h, replaceChildren } from "./dom";
import { holdsPartner } from "../src/shared/permissions";
import { ngayDayDu, vnToday } from "../src/shared/vn-date";

const lyDo = (e: unknown): string => (e instanceof ApiError ? e.message : "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");

export async function initToChucCuaToi(staff: Staff, el: HTMLElement): Promise<void> {
  if (!holdsPartner(staff)) return;
  const [tc, lm] = await Promise.all([
    api<Api.TuCachCuaToiResponse>("/api/to-chuc/cua-toi").then((r) => r.tuCach.filter((t) => t.laToChuc)).catch(() => null),
    api<Api.LoiMoiCuaToiResponse>("/api/to-chuc/loi-moi-cua-toi").then((r) => r.loiMoi).catch(() => null),
  ]);
  if (tc === null && lm === null) return;
  const bao = h("p", { class: "muted", role: "status", id: "tc-nhan-bao", hidden: true });
  const baoCau = (cau: string, loi = false): void => { bao.hidden = false; bao.className = loi ? "o-loi" : "alert ok"; bao.textContent = cau; };
  /** Nhận xong: tải lại trang (ô Tư cách, danh sách tổ chức đổi theo). */
  const nhan = async (nut: HTMLButtonElement, than: { ma: string } | { loiMoiId: string }): Promise<void> => {
    nut.disabled = true;
    bao.hidden = true;
    try {
      const r = await api<{ toChuc: { ten: string } }>("/api/to-chuc/loi-moi/nhan", { method: "POST", body: than });
      baoCau(`Bạn đã là thành viên của ${r.toChuc.ten}. Từ giờ bạn lập đơn được với tư cách tổ chức này.`);
      setTimeout(() => location.reload(), 1500);
    } catch (e) {
      baoCau(lyDo(e), true);
      nut.disabled = false;
    }
  };
  const dsToChuc = tc ?? [];
  const dsLoiMoi = lm ?? [];
  const oMa = h("input", { type: "text", class: "o", id: "tc-nhan-ma", autocomplete: "off", autocapitalize: "characters", maxlength: 12 }) as HTMLInputElement;
  const nutMa = h("button", { type: "button", class: "nut", "data-cap": "phu", id: "tc-nhan-ma-nut" }, "Nhận") as HTMLButtonElement;
  nutMa.addEventListener("click", () => {
    if (oMa.value.trim() === "") { baoCau("Hãy nhập mã vào tổ chức.", true); oMa.focus(); return; }
    void nhan(nutMa, { ma: oMa.value.trim() });
  });
  replaceChildren(
    el,
    h("h2", { id: "tc-cua-toi-heading" }, "Hồ sơ tổ chức"),
    dsToChuc.length
      ? h("ul", null, ...dsToChuc.map((t) => t.loai === "MEMBER"
          ? h("li", { "data-thanh-vien-cua": t.partyId }, t.ten, " · Thành viên")
          : h("li", null, h("a", { href: `/to-chuc?id=${encodeURIComponent(t.partyId)}` }, t.ten), " · Người quản lý tổ chức")))
      : null,
    dsLoiMoi.length
      ? h("div", { id: "tc-loi-moi-cua-toi" }, h("h3", null, "Lời mời vào tổ chức"),
          h("ul", { class: "tc-lm-ds" }, ...dsLoiMoi.map((x) => {
            const nut = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-nhan-loi-moi": x.id }, "Nhận") as HTMLButtonElement;
            nut.addEventListener("click", () => void nhan(nut, { loiMoiId: x.id }));
            return h("li", { class: "dong tc-dong" }, h("span", { class: "tc-dong-ten" }, x.toChuc.ten, " ", h("span", { class: "muted" }, `dùng được tới ${ngayDayDu(vnToday(new Date(x.hetHan)))}`)), nut);
          })))
      : null,
    lm !== null
      ? h("div", { class: "tv-hang" }, h("label", { class: "dk-o" }, h("span", { class: "nhan" }, "Mã vào tổ chức"), oMa),
          h("p", { class: "muted" }, "Có mã do người quản lý của một tổ chức gửi? Nhập mã rồi bấm «Nhận»."), nutMa)
      : null,
    bao,
  );
  el.hidden = false;
}
