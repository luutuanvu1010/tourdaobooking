// Mục "Chính sách đăng nhập" trên trang Phiên đăng nhập (ADR-0085; đặc tả §5). Toàn quyền chọn cho từng quyền Một máy / Nhiều máy; dòng Toàn quyền khoá cứng.
// Lưu: xem trước (số máy/số người) → hộp xác nhận TRONG TRANG (không confirm()) → PUT → tải lại. 409 → "Chính sách vừa được người khác đổi — đã tải lại".
// Người gọi đã hỏi can(staff, "auth.session.policy"); máy chủ vẫn kiểm lại.
import { ApiError, api, type Api } from "./api";
import { CANH_BAO_NHIEU_MAY_BEN_NGOAI, QUYEN_DAT_DUOC, canCanhBaoBenNgoai, isQuyenDatDuoc, thayDoiChinhSach, type QuyenDatDuoc } from "../src/shared/chinh-sach-dang-nhap";
import { h, replaceChildren } from "./dom";

export async function dungMucChinhSach(el: HTMLElement): Promise<void> {
  let rows: Api.SessionPolicyRowDto[] = [];
  let chon = new Map<QuyenDatDuoc, boolean>();
  let xemTruoc: Api.SessionPolicyPreviewResponse | null = null;
  let bao: { loai: "ok" | "loi"; chu: string } | null = null;
  let dangGui = false;

  async function tai(): Promise<void> {
    rows = (await api<Api.SessionPolicyResponse>("/api/sessions/policy")).rows;
    chon = new Map(rows.flatMap((r) => (isQuyenDatDuoc(r.permissionCode) ? [[r.permissionCode, r.multi] as [QuyenDatDuoc, boolean]] : [])));
    xemTruoc = null;
  }
  const nut = (label: string, onclick: () => void, cls: string): HTMLButtonElement => {
    const b = h("button", { type: "button", class: cls, disabled: dangGui }, label);
    b.addEventListener("click", onclick);
    return b;
  };
  const thayDoi = () => thayDoiChinhSach(rows, chon);

  async function bamLuu(): Promise<void> {
    if (dangGui || thayDoi().length === 0) return;
    dangGui = true;
    bao = null;
    render();
    try {
      const tap = QUYEN_DAT_DUOC.filter((c) => chon.get(c) === true).join(",");
      xemTruoc = await api<Api.SessionPolicyPreviewResponse>(`/api/sessions/policy/preview?nhieuMay=${encodeURIComponent(tap)}`);
    } catch (err) {
      bao = { loai: "loi", chu: err instanceof ApiError ? err.message : "Không kết nối được máy chủ." };
    } finally {
      dangGui = false;
      render();
    }
  }
  async function xacNhan(): Promise<void> {
    if (dangGui) return;
    dangGui = true;
    render();
    try {
      const r = await api<Api.SessionPolicySaveResponse>("/api/sessions/policy", { method: "PUT", body: { thayDoi: thayDoi() } satisfies Api.SessionPolicySaveRequest });
      bao = { loai: "ok", chu: `Đã lưu. Đã đăng xuất ${r.soPhien} máy của ${r.soNguoi} người.` };
      await tai();
    } catch (err) {
      if (err instanceof ApiError && err.code === "policy_stale") {
        bao = { loai: "loi", chu: "Chính sách vừa được người khác đổi — đã tải lại" };
        // Tải lại bọc riêng: lỗi ở đây không được thành lời hứa bị từ chối mà không ai xử lý.
        try {
          await tai();
        } catch (loiTai) {
          bao = { loai: "loi", chu: loiTai instanceof ApiError ? loiTai.message : "Chính sách vừa được người khác đổi — chưa tải lại được, hãy mở lại trang." };
        }
      } else bao = { loai: "loi", chu: err instanceof ApiError ? err.message : "Không kết nối được máy chủ." };
    } finally {
      dangGui = false;
      xemTruoc = null;
      render();
    }
  }

  function dong(r: Api.SessionPolicyRowDto): HTMLElement {
    if (!isQuyenDatDuoc(r.permissionCode)) return h("tr", null);
    const code = r.permissionCode;
    const radio = (multi: boolean, label: string) => {
      const i = h("input", { type: "radio", name: `pol-${code}`, value: multi ? "1" : "0", checked: chon.get(code) === multi, disabled: dangGui });
      i.addEventListener("change", () => { chon.set(code, multi); xemTruoc = null; render(); });
      return h("label", { class: "check" }, i, label);
    };
    return h("tr", { "data-quyen": code }, h("td", null, r.label), h("td", null, radio(false, "Một máy")), h("td", null, radio(true, "Nhiều máy")));
  }

  function render(): void {
    const coDoi = thayDoi().length > 0;
    replaceChildren(
      el,
      h("h2", null, "Chính sách đăng nhập"),
      h("p", { class: "muted" }, "Mỗi quyền chọn Một máy (đăng nhập máy mới thì máy cũ tự đăng xuất) hoặc Nhiều máy. Tài khoản có một quyền Nhiều máy là được nhiều máy."),
      bao && h("div", { class: bao.loai === "ok" ? "alert ok" : "alert", role: bao.loai === "ok" ? "status" : "alert" }, bao.chu),
      h("table", { class: "items" },
        h("thead", null, h("tr", null, h("th", null, "Quyền"), h("th", { colSpan: 2 }, "Số máy được đăng nhập cùng lúc"))),
        h("tbody", null, ...rows.map(dong),
          h("tr", { "data-quyen": "SUPER_ADMIN" }, h("td", null, "Toàn quyền"), h("td", { colSpan: 2, class: "muted" }, "Luôn nhiều máy · Vai trò IT luôn được nhiều máy")))),
      canCanhBaoBenNgoai(chon) && h("p", { class: "alert warn", "data-canh-bao": "ben-ngoai" }, CANH_BAO_NHIEU_MAY_BEN_NGOAI),
      h("div", { class: "maint-actions" },
        nut("Tất cả một máy", () => { for (const c of QUYEN_DAT_DUOC) chon.set(c, false); xemTruoc = null; render(); }, "btn"),
        nut("Tất cả nhiều máy", () => { for (const c of QUYEN_DAT_DUOC) chon.set(c, true); xemTruoc = null; render(); }, "btn"),
        coDoi && nut("Lưu chính sách", () => void bamLuu(), "btn btn-primary btn-chinh")),
      xemTruoc && h("div", { class: "maint-confirm", role: "group", "aria-label": "Xác nhận lưu chính sách" },
        h("p", null, h("strong", null, `Sẽ đăng xuất ${xemTruoc.soPhien} máy của ${xemTruoc.soNguoi} người. Lưu?`)),
        h("div", { class: "maint-actions" },
          nut("Xác nhận lưu", () => void xacNhan(), "btn btn-primary btn-chinh"),
          nut("Thôi", () => { xemTruoc = null; render(); }, "btn"))),
    );
    el.hidden = false;
  }

  try {
    await tai();
  } catch (err) {
    bao = { loai: "loi", chu: err instanceof ApiError ? err.message : "Không kết nối được máy chủ." };
  }
  render();
}
