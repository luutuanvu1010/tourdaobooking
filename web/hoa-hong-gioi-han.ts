// Trang "Giới hạn nhập hoa hồng" (ADR-0161 Đ3): Toàn quyền đặt trần phần trăm và bước số tiền áp cho MỨC NHẬP MỚI của Hoa hồng đối tác. Chốt chặn `moTrang` của bảng mục (ô settings.ops, không Đối tác); máy chủ vẫn kiểm lại. Không innerHTML.
//   GET  /api/pricing/gioi-han-nhap → { tranTyLeBp, buocTien, tuLuc }
//   POST /api/pricing/gioi-han-nhap { tranTyLeBp, buocTien, tuLuc } → cùng khuôn (khoá lạc quan: `tuLuc` lệch dòng mới nhất ⇒ 409, hiện nguyên câu máy chủ)
// Số mới áp cho các mức nhập từ lúc này; mức đã có và đơn đã xác nhận giữ nguyên (máy chủ không áp lại dòng cũ).
import { ApiError, api, type Api } from "./api";
import { moTrang } from "../src/shared/muc-giao-dien";
import { cauGioiHanDangAp } from "../src/shared/hoa-hong-hien-thi";
import { docTienMoiKhach, docTyLePhanTram } from "../src/shared/so-dai-ly-nhap";
import { nhanDong, nhanTyLeBp } from "../src/shared/so-dai-ly-nhan";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const okEl = byId("ok");
const noiDungEl = byId("hgh-noi-dung");

/** Câu dưới hai ô; chữ đúng từng chữ theo kế hoạch ADR-0161 Task 8. */
const CAU_AP_CHO = "Số mới áp cho các mức nhập từ lúc này; mức đã có và đơn đã xác nhận giữ nguyên.";
const CAU_CHI_TOAN_QUYEN = "Trang này chỉ Toàn quyền dùng được.";
const CAU_PHAN_TRAM_SAI = "Phần trăm tối đa là số lớn hơn 0 và không quá 100 (vd 50 hoặc 12,5).";
const CAU_BUOC_SAI = "Số tiền phải chia hết cho là số nguyên đồng từ 1 đến 1.000.000 (vd 1.000).";
/** Cùng khoảng với `kiemThanGioiHan` của máy chủ (src/shared/gioi-han-nhap-muc.ts): bước tiền 1…1.000.000 đồng. */
const BUOC_TIEN_TOI_DA = 1_000_000;

const staff = await initShell();
const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

if (!moTrang("hoaHongGioiHan", staff)) {
  showError(errorEl, CAU_CHI_TOAN_QUYEN);
} else {
  try {
    let hienTai = await api<Api.GioiHanNhapResponse>("/api/pricing/gioi-han-nhap");
    const oTyLe = h("input", { type: "text", class: "o", id: "hgh-ty-le", inputMode: "decimal", autocomplete: "off", maxLength: 7, required: true, value: nhanTyLeBp(hienTai.tranTyLeBp).replace("%", "") });
    const oBuoc = h("input", { type: "text", class: "o", id: "hgh-buoc-tien", inputMode: "numeric", autocomplete: "off", maxLength: 9, required: true, value: nhanDong(hienTai.buocTien) });
    const dangAp = h("p", { class: "muted", id: "hgh-dang-ap" }, cauGioiHanDangAp(hienTai));
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const nut = h("button", { type: "submit", class: "btn btn-primary", "data-action": "luu-gioi-han" }, "Lưu");
    const form = h(
      "form",
      { id: "hgh-form" },
      dangAp,
      h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "hgh-ty-le" }, "Phần trăm tối đa (%)"), oTyLe),
      h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "hgh-buoc-tien" }, "Số tiền phải chia hết cho (đồng)"), oBuoc),
      h("p", { class: "muted" }, CAU_AP_CHO),
      loi,
      h("div", { class: "handler-actions" }, nut),
    );
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      loi.hidden = true;
      okEl.hidden = true;
      const ty = docTyLePhanTram(oTyLe.value);
      if (!ty.ok || ty.bp < 1) {
        loi.textContent = CAU_PHAN_TRAM_SAI;
        loi.hidden = false;
        return;
      }
      const buoc = docTienMoiKhach(oBuoc.value);
      if (!buoc.ok || buoc.dong < 1 || buoc.dong > BUOC_TIEN_TOI_DA) {
        loi.textContent = CAU_BUOC_SAI;
        loi.hidden = false;
        return;
      }
      nut.disabled = true;
      try {
        hienTai = await api<Api.GioiHanNhapResponse>("/api/pricing/gioi-han-nhap", { method: "POST", body: { tranTyLeBp: ty.bp, buocTien: buoc.dong, tuLuc: hienTai.tuLuc } });
        oTyLe.value = nhanTyLeBp(hienTai.tranTyLeBp).replace("%", "");
        oBuoc.value = nhanDong(hienTai.buocTien);
        dangAp.textContent = cauGioiHanDangAp(hienTai);
        okEl.textContent = `Đã lưu. ${cauGioiHanDangAp(hienTai)}`;
        okEl.hidden = false;
      } catch (err) {
        loi.textContent = lyDoLoi(err);
        loi.hidden = false;
      } finally {
        nut.disabled = false;
      }
    });
    replaceChildren(noiDungEl, form);
    noiDungEl.hidden = false;
  } catch (err) {
    showError(errorEl, lyDoLoi(err));
  }
}
