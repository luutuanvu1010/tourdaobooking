// Trang "Kho vé điện tử" (ADR-0153; kế hoạch Task 9a). Gọi các route của module ve-dien-tu:
//   GET  /api/ve/kho                    → tồn kho theo dịch vụ + loại khách (chỉ ĐẾM: còn trống, sắp hết hạn trong 7 ngày, đã giữ, đã giao)
//   POST /api/ve/lo                     → mở lô (một dịch vụ + một loại khách + tên sản phẩm, chọn MỘT lần cho cả lô)
//   POST /api/ve/lo/:id/ve              → thêm ảnh vé (JSON base64, tối đa 10 ảnh mỗi đợt, JPG/PNG ≤ 3 MB)
//   POST /api/ve/lo/:id/xac-nhan        → đưa lô vào kho
// Mã vé nhân viên gõ từng vé (hoặc dán nhiều dòng); khoảng ngày dùng chung cho cả lô. Phản hồi của máy chủ chỉ có 4 số cuối mã — trang không bao giờ hiện mã đầy đủ.
// Ẩn/hiện hỏi bảng quyền: ô `ve.kho.manage`. Máy chủ vẫn kiểm lại. Không `innerHTML` (dựng bằng `h()`).
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

interface KhoDong { catalogCode: string; tenDichVu: string | null; nhomKhach: "ADULT" | "CHILD" | "SENIOR"; conTrong: number; sapHetHan: number; daGiu: number; daGiao: number }
interface ThemVeRes { loId: string; themDuoc: number; chuaLuuVaoKho: number; loai: { thuTu: number; lyDo: string }[]; veTrongLo: number }

const NHAN_NHOM: Record<string, string> = { ADULT: "Người lớn", CHILD: "Trẻ em", SENIOR: "Cao tuổi" };
const TOI_DA_MOI_DOT = 10;
const TOI_DA_BYTE = 3 * 1024 * 1024;

const errorEl = byId("error");
const okEl = byId("ok");
const noiDungEl = byId("vk-noi-dung");
const khoEl = byId("vk-kho");
const loEl = byId("vk-lo");

const staff = await initShell();
const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const hienOk = (text: string | null): void => { okEl.textContent = text ?? ""; okEl.hidden = !text; };

/** Đọc một tệp thành base64 (không tiền tố data:). */
function docBase64(tep: File): Promise<string> {
  return new Promise((xong, hong) => {
    const r = new FileReader();
    r.onload = () => xong(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => hong(new Error("Không đọc được tệp."));
    r.readAsDataURL(tep);
  });
}

if (!can(staff, "ve.kho.manage")) {
  showError(errorEl, "Trang Kho vé điện tử chỉ Bán hàng, Quản trị và Toàn quyền dùng được.");
} else {
  noiDungEl.hidden = false;

  async function taiKho(): Promise<void> {
    replaceChildren(khoEl, h("p", { class: "muted" }, "Đang tải…"));
    try {
      const r = await api<{ kho: KhoDong[] }>("/api/ve/kho");
      if (r.kho.length === 0) { replaceChildren(khoEl, h("p", { class: "muted" }, "Kho chưa có vé nào. Nhập lô đầu tiên ở khối bên dưới.")); return; }
      replaceChildren(khoEl, h("ul", { class: "pay-list", "data-khoi": "ton-kho" }, ...r.kho.map((d) =>
        h("li", { "data-ma": d.catalogCode },
          h("strong", null, `${d.tenDichVu ?? d.catalogCode} · ${NHAN_NHOM[d.nhomKhach] ?? d.nhomKhach}`),
          h("p", { class: "muted" }, `Còn trống ${d.conTrong} · sắp hết hạn (7 ngày) ${d.sapHetHan} · đã giữ cho đơn ${d.daGiu} · đã giao ${d.daGiao}`)))));
    } catch (err) {
      replaceChildren(khoEl, h("p", { class: "alert", role: "alert" }, lyDoLoi(err)));
    }
  }

  async function dungForm(): Promise<void> {
    let dichVu: { code: string; name: string }[] = [];
    let loiDanhMuc: string | null = null;
    try {
      const r = await api<Api.CatalogPublicResponse>("/api/catalog");
      dichVu = r.items.map((i) => ({ code: i.code, name: i.name })).sort((a, b) => a.name.localeCompare(b.name, "vi"));
    } catch (err) { loiDanhMuc = lyDoLoi(err); }

    const chonDv = h("select", { class: "o", id: "vk-dich-vu", required: true }, h("option", { value: "" }, "Chọn dịch vụ…"), ...dichVu.map((d) => h("option", { value: d.code }, d.name)));
    const chonNhom = h("select", { class: "o", id: "vk-nhom" }, ...Object.entries(NHAN_NHOM).map(([ma, ten]) => h("option", { value: ma }, ten)));
    const tenSp = h("input", { type: "text", class: "o", id: "vk-ten-sp", maxLength: 120, required: true, placeholder: "Tên sản phẩm in trên vé" });
    const tuNgay = h("input", { type: "date", class: "o", id: "vk-tu-ngay", required: true });
    const denNgay = h("input", { type: "date", class: "o", id: "vk-den-ngay", required: true });
    const tep = h("input", { type: "file", class: "o", id: "vk-tep", accept: "image/jpeg,image/png", multiple: true, required: true });
    const maVe = h("textarea", { class: "o", id: "vk-ma-ve", rows: 5, placeholder: "Mỗi dòng MỘT mã vé, đúng thứ tự các ảnh đã chọn", required: true });
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const trangThai = h("p", { class: "muted", role: "status", hidden: true });
    const nutGui = h("button", { type: "submit", class: "btn btn-primary", "data-action": "nhap-lo" }, "Nhập lô vào kho");
    const truong = (nhan: string, id: string, o: HTMLElement) => h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: id }, nhan), o);

    const form = h("form", { id: "vk-form", novalidate: false },
      loiDanhMuc ? h("p", { class: "alert", role: "alert" }, loiDanhMuc) : null,
      truong("Dịch vụ", "vk-dich-vu", chonDv), truong("Loại khách", "vk-nhom", chonNhom), truong("Tên sản phẩm in trên vé", "vk-ten-sp", tenSp),
      truong("Dùng từ ngày (chung cho cả lô)", "vk-tu-ngay", tuNgay), truong("Dùng đến ngày (chung cho cả lô)", "vk-den-ngay", denNgay),
      truong("Ảnh vé (JPG hoặc PNG, mỗi ảnh tối đa 3 MB)", "vk-tep", tep), truong("Mã vé", "vk-ma-ve", maVe),
      loi, trangThai, h("div", { class: "handler-actions" }, nutGui));

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      loi.hidden = true; hienOk(null);
      const tepDs = [...(tep.files ?? [])];
      const maDs = maVe.value.split("\n").map((x) => x.trim()).filter((x) => x !== "");
      if (tepDs.length === 0) { loi.textContent = "Chọn ít nhất một ảnh vé."; loi.hidden = false; return; }
      if (maDs.length !== tepDs.length) { loi.textContent = `Số mã vé (${maDs.length}) phải bằng số ảnh (${tepDs.length}), mỗi dòng một mã theo thứ tự ảnh.`; loi.hidden = false; return; }
      const qua = tepDs.find((t) => t.size > TOI_DA_BYTE);
      if (qua) { loi.textContent = "Có ảnh lớn hơn 3 MB. Chọn ảnh nhỏ hơn."; loi.hidden = false; return; }
      nutGui.disabled = true;
      try {
        const lo = await api<{ loId: string }>("/api/ve/lo", { method: "POST", body: { catalogCode: chonDv.value, nhomKhach: chonNhom.value, tenSanPham: tenSp.value } });
        let them = 0;
        const bi: string[] = [];
        for (let i = 0; i < tepDs.length; i += TOI_DA_MOI_DOT) {
          const doan = tepDs.slice(i, i + TOI_DA_MOI_DOT);
          trangThai.hidden = false;
          trangThai.textContent = `Đang gửi ${Math.min(i + doan.length, tepDs.length)}/${tepDs.length} ảnh…`;
          const ve = await Promise.all(doan.map(async (t, k) => ({ noiDung: await docBase64(t), maVe: maDs[i + k]!, tuNgay: tuNgay.value, denNgay: denNgay.value })));
          const r = await api<ThemVeRes>(`/api/ve/lo/${encodeURIComponent(lo.loId)}/ve`, { method: "POST", body: { ve } });
          them += r.themDuoc;
          for (const l of r.loai) bi.push(`Ảnh ${i + l.thuTu + 1}: ${l.lyDo}`);
          if (r.chuaLuuVaoKho > 0) bi.push(`${r.chuaLuuVaoKho} ảnh chưa lưu được vào kho, thử gửi lại.`);
        }
        if (bi.length > 0) { loi.textContent = bi.join(" "); loi.hidden = false; }
        if (them === 0) { trangThai.textContent = "Chưa có vé nào vào lô. Sửa các lỗi ở trên rồi thử lại."; return; }
        await api(`/api/ve/lo/${encodeURIComponent(lo.loId)}/xac-nhan`, { method: "POST", body: {} });
        trangThai.hidden = true;
        hienOk(`Đã nhập ${them} vé vào kho.`);
        form.reset();
        await taiKho();
      } catch (err) {
        loi.textContent = lyDoLoi(err); loi.hidden = false;
      } finally {
        nutGui.disabled = false;
      }
    });
    replaceChildren(loEl, form);
  }

  await Promise.all([taiKho(), dungForm()]);
}
