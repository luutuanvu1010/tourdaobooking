// Khối «Khoản nộp» trong «Phiếu công nợ với Tour Đảo» (ADR-0182 phần B, Đ2 mục 4–11). Mọi số (trần, X của «Khách đã trả bạn», quyền bấm) do máy chủ gửi trong `phieu.nop`;
// giao diện chỉ ẩn / hiện và gửi lại đúng số máy chủ đã đưa. Máy chủ kiểm lại mọi thứ (trần, khoản chờ, người quyết ≠ người ghi).
import { ApiError, api, type Api } from "./api";
import { h, replaceChildren } from "./dom";
import { vnd, parseMoney, dateTime } from "./format";
import { regroupMoney, setMoneyValue } from "./money-input";
import { hoiXacNhan } from "./bang-truot";
import { ACCEPT_ANH_PDF, chuanBiBienLai } from "./thu-nho-anh";
import { NHAN_O_BIEN_LAI, NHAN_XEM_BIEN_LAI, cauTrangThaiBienLai } from "../src/shared/bien-lai";
import { NHAN_TRANG_THAI_NOP, NUT_DA_CHUYEN_TIEN, TEN_KHOAN_NOP, dongKhachDaTra, duongBienLaiNop } from "../src/shared/cong-no-dai-ly";
import { ngayDayDu, vnToday } from "../src/shared/vn-date";

const loiCua = (err: unknown): string => (err instanceof ApiError ? err.message : "Không gửi được — kiểm tra mạng rồi thử lại.");

/** Một dòng khoản nộp: số, ngày chuyển, trạng thái, lý do từ chối, biên lai; Kế toán (không phải người ghi) có hai nút quyết khi khoản còn chờ. */
function dongKhoan(orderId: string, k: Api.KhoanNopDto, xacNhanDuoc: boolean, taiLai: () => void): HTMLElement {
  const bl = cauTrangThaiBienLai(k.bienLai);
  const xem = bl === null
    ? h("a", { class: "btn btn-link", href: duongBienLaiNop(orderId, k.id), target: "_blank", rel: "noopener", "data-action": "xem-bien-lai-nop" }, NHAN_XEM_BIEN_LAI)
    : h("span", { class: "muted" }, ` · ${bl}`);
  const li = h(
    "li",
    { "data-khoan-nop": k.id, "data-trang-thai": k.trangThai },
    `${TEN_KHOAN_NOP} ${vnd(k.soTien)} · chuyển ngày ${ngayDayDu(k.ngayChuyen)} · `,
    h("strong", null, NHAN_TRANG_THAI_NOP[k.trangThai]),
    " ",
    xem,
    k.lyDoTuChoi ? h("p", { class: "muted", "data-khoi": "ly-do-tu-choi" }, `Lý do: ${k.lyDoTuChoi}`) : null,
    k.quyetLuc ? h("p", { class: "muted" }, dateTime(k.quyetLuc)) : null,
  );
  if (!(xacNhanDuoc && k.trangThai === "PENDING" && !k.laNguoiGhi)) return li;
  const nhan = h("button", { type: "button", class: "btn btn-primary", "data-action": "xac-nhan-nop" }, "Xác nhận đã nhận");
  const tu = h("button", { type: "button", class: "btn", "data-action": "tu-choi-nop" }, "Từ chối");
  const loi = h("p", { class: "alert danger", role: "alert", hidden: true });
  const baoLoi = (cau: string) => {
    loi.textContent = cau;
    loi.hidden = false;
  };
  nhan.addEventListener("click", async () => {
    if (!(await hoiXacNhan({ tieuDe: "Xác nhận khoản nộp", hauQua: `Đã đối chiếu sao kê: công ty đã nhận ${vnd(k.soTien)} của đại lý? Khoản này sẽ trừ vào công nợ của đơn.`, nhanNguyHiem: "Xác nhận đã nhận", opener: nhan }))) return;
    nhan.disabled = true;
    try {
      await api(`/api/orders/${encodeURIComponent(orderId)}/khoan-nop/${encodeURIComponent(k.id)}/xac-nhan`, { method: "POST", body: {} });
      taiLai();
    } catch (err) {
      nhan.disabled = false;
      baoLoi(loiCua(err));
    }
  });
  tu.addEventListener("click", () => {
    const o = h("textarea", { rows: 2, maxlength: 500, "aria-label": "Lý do từ chối" }) as HTMLTextAreaElement;
    const gui = h("button", { type: "submit", class: "btn btn-danger", "data-action": "tu-choi-nop-gui" }, "Từ chối");
    const thoi = h("button", { type: "button", class: "btn" }, "Thôi");
    const form = h("form", { class: "stack", "data-khoi": "tu-choi-nop" }, h("label", null, "Lý do từ chối (đại lý sẽ thấy)", o), h("div", { class: "handler-actions" }, gui, thoi)) as HTMLFormElement;
    thoi.addEventListener("click", () => form.remove());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (o.value.trim().length < 5) return baoLoi("Ghi lý do từ chối (ít nhất 5 ký tự) để đại lý hiểu.");
      gui.disabled = true;
      try {
        await api(`/api/orders/${encodeURIComponent(orderId)}/khoan-nop/${encodeURIComponent(k.id)}/tu-choi`, { method: "POST", body: { lyDo: o.value.trim() } });
        taiLai();
      } catch (err) {
        gui.disabled = false;
        baoLoi(loiCua(err));
      }
    });
    li.append(form);
    o.focus();
  });
  li.append(h("div", { class: "handler-actions" }, nhan, tu), loi);
  return li;
}

/** Form «Đã chuyển tiền» (Đ2 mục 4, 9): số tiền (điền sẵn số còn được nộp, sửa được), ngày chuyển, dòng «Khách đã trả bạn X ₫» (máy chủ tính), ảnh biên lai BẮT BUỘC. */
function formNop(orderId: string, nop: Api.PhieuNopDto, wrap: HTMLElement, mo: HTMLElement, taiLai: () => void): HTMLFormElement {
  const so = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", id: "nop-so-tien" }) as HTMLInputElement;
  setMoneyValue(so, nop.tran);
  so.addEventListener("input", () => regroupMoney(so));
  const homNay = vnToday(new Date());
  const ngay = h("input", { type: "date", id: "nop-ngay", value: homNay, max: homNay }) as HTMLInputElement;
  const anh = h("input", { type: "file", accept: ACCEPT_ANH_PDF, id: "nop-bien-lai" }) as HTMLInputElement;
  const X = nop.khachDaTra ?? 0;
  const gui = h("button", { type: "submit", class: "btn btn-primary", "data-action": "da-chuyen-tien-gui" }, NUT_DA_CHUYEN_TIEN);
  const thoi = h("button", { type: "button", class: "btn" }, "Thôi");
  const loi = h("p", { class: "alert danger", role: "alert", hidden: true });
  const baoLoi = (cau: string) => {
    loi.textContent = cau;
    loi.hidden = false;
  };
  const form = h(
    "form",
    { class: "stack", "data-khoi": "form-nop" },
    h("label", { for: "nop-so-tien" }, `Số tiền đã chuyển (còn phải nộp ${vnd(nop.tran)})`, so),
    h("label", { for: "nop-ngay" }, "Ngày chuyển", ngay),
    X > 0 ? h("p", { "data-khoi": "khach-da-tra" }, h("strong", null, dongKhachDaTra(vnd(X)))) : null,
    X > 0 ? h("p", { class: "muted" }, "Gửi khoản này cũng ghi nhận số tiền trên là khách đã trả cho bạn.") : null,
    h("label", { for: "nop-bien-lai" }, NHAN_O_BIEN_LAI, anh),
    loi,
    h("div", { class: "handler-actions" }, gui, thoi),
  ) as HTMLFormElement;
  thoi.addEventListener("click", () => replaceChildren(wrap, mo));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    loi.hidden = true;
    const soTien = parseMoney(so.value);
    if (soTien <= 0) return baoLoi("Nhập số tiền đã chuyển.");
    if (soTien > nop.tran) return baoLoi(`Số tiền vượt số còn phải nộp (${vnd(nop.tran)}).`);
    if (!ngay.value) return baoLoi("Chọn ngày chuyển tiền.");
    const tep = anh.files?.[0];
    if (!tep) return baoLoi("Chọn ảnh biên lai chuyển khoản trước khi gửi.");
    gui.disabled = true;
    try {
      const bl = await chuanBiBienLai(tep);
      if ("loi" in bl) {
        gui.disabled = false;
        return baoLoi(bl.loi);
      }
      const than: Api.KhoanNopRequest = { soTien, ngayChuyen: ngay.value, khachDaTra: X, bienLai: bl };
      await api(`/api/orders/${encodeURIComponent(orderId)}/khoan-nop`, { method: "POST", body: than });
      taiLai();
    } catch (err) {
      gui.disabled = false;
      baoLoi(loiCua(err));
    }
  });
  return form;
}

/** Khối khoản nộp của phiếu. `null` khi không có gì để hiện (không khoản nào, không bấm được). `taiLai` mở lại phiếu với số mới. */
export function khoiKhoanNop(orderId: string, nop: Api.PhieuNopDto | undefined, taiLai: () => void): HTMLElement | null {
  if (!nop || (nop.khoan.length === 0 && !nop.ghiDuoc)) return null;
  const ds = nop.khoan.length ? h("ul", { class: "pay-list", "data-khoi": "khoan-nop" }, ...nop.khoan.map((k) => dongKhoan(orderId, k, nop.xacNhanDuoc, taiLai))) : null;
  let nut: HTMLElement | null = null;
  if (nop.ghiDuoc) {
    const wrap = h("div", { "data-khoi": "nop-wrap" });
    const mo = h("button", { type: "button", class: "btn btn-primary", "data-action": "da-chuyen-tien" }, NUT_DA_CHUYEN_TIEN);
    mo.addEventListener("click", () => {
      replaceChildren(wrap, formNop(orderId, nop, wrap, mo, taiLai));
      (wrap.querySelector("#nop-so-tien") as HTMLInputElement | null)?.focus();
    });
    replaceChildren(wrap, mo);
    nut = wrap;
  }
  return h("div", { "data-khoi": "phieu-khoan-nop" }, h("h3", null, TEN_KHOAN_NOP), ds, nut);
}
