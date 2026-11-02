// Trang "Vé điện tử" (ADR-0153, ADR-0156). Gọi các route của module ve-dien-tu:
//   GET  /api/ve/kho                    → số vé theo dịch vụ + loại khách (chỉ ĐẾM) và trần lô đang áp
//   GET  /api/ve/lo                     → các lô còn huỷ được (chưa vé nào từng được giữ chỗ)
//   GET  /api/ve/lo-da-huy              → các lô huỷ trong hạn lưu ảnh, mỗi vé kèm trạng thái ảnh
//   POST /api/ve/lo-da-huy/:veId/mo     → mở ảnh: vé bị khoá hẳn, không nhập lại được
//   GET  /api/ve/lo-da-huy/:veId/anh    → ảnh của vé đã mở
//   POST /api/ve/lo                     → mở lô (một dịch vụ + một loại khách + tên sản phẩm, chọn MỘT lần cho cả lô); vượt trần ⇒ 400, không tạo lô
//   POST /api/ve/lo/:id/ve              → thêm ảnh vé (JSON base64, tối đa 10 ảnh mỗi đợt, JPG/PNG ≤ 3 MB)
//   POST /api/ve/lo/:id/xac-nhan        → đưa lô vào kho
//   POST /api/ve/lo/:id/bo              → huỷ lô; ảnh vé của lô nhập lại được
// Mã vé do máy đọc từ QR trên từng ảnh, ngay trên trình duyệt (ADR-0156 Đ1); ảnh không đọc được thì loại riêng, không có đường nhập tay. Khoảng ngày dùng chung cho cả lô.
// Phản hồi của máy chủ chỉ có 4 số cuối mã — trang không bao giờ hiện mã đầy đủ.
// Ẩn/hiện hỏi bảng quyền: ô `ve.kho.manage`. Máy chủ vẫn kiểm lại. Không `innerHTML` (dựng bằng `h()`).
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { NGAY_LUU_ANH_LO_HUY, TOI_DA_BYTE_ANH, TOI_DA_VE_MOI_DOT, TRAN_LO_MAC_DINH, cauVuotTran, locAnhDaDoc } from "../src/shared/ve-nhap-lo";
import { hoiXacNhan } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { docQrTuTep } from "./qr-doc-ve";
import { initShell, showError } from "./shell";

interface KhoDong { catalogCode: string; tenDichVu: string | null; nhomKhach: "ADULT" | "CHILD" | "SENIOR"; conTrong: number; sapHetHan: number; daGiu: number; daGiao: number }
interface ThemVeRes { loId: string; themDuoc: number; chuaLuuVaoKho: number; loai: { thuTu: number; lyDo: string }[]; veTrongLo: number }
interface LoBoDuoc { loId: string; tenDichVu: string | null; nhomKhach: string; tenSanPham: string; trangThai: string; soVe: number; taoLuc: string }

interface VeDaHuy { veId: string; duoiMa: string; tuNgay: string; denNgay: string; trangThaiAnh: "CHUA_MO" | "DA_MO" | "DA_NHAP_LAI" | "HET_ANH" }
interface LoDaHuy { loId: string; tenDichVu: string | null; nhomKhach: string; tenSanPham: string; huyLuc: string; huyBoi: string | null; ve: VeDaHuy[] }

const NHAN_NHOM: Record<string, string> = { ADULT: "Người lớn", CHILD: "Trẻ em", SENIOR: "Cao tuổi" };

const errorEl = byId("error");
const okEl = byId("ok");
const noiDungEl = byId("vk-noi-dung");
const khoEl = byId("vk-kho");
const loEl = byId("vk-lo");
const cacLoEl = byId("vk-cac-lo");
const daHuyEl = byId("vk-da-huy");

const staff = await initShell();
const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const hienOk = (text: string | null): void => { okEl.textContent = text ?? ""; okEl.hidden = !text; };
const ngayVn = (iso: string): string => new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10).split("-").reverse().join("/");
const gioVn = (iso: string): string => new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(11, 16);
const ngayDung = (tu: string, den: string): string => { const [a, b] = [tu, den].map((n) => n.split("-").reverse().join("/")); return a === b ? `dùng ngày ${a}` : `dùng từ ${a} đến ${b}`; };

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
  showError(errorEl, "Trang Vé điện tử chỉ Bán hàng, Quản trị và Toàn quyền dùng được.");
} else {
  noiDungEl.hidden = false;
  let tranLo = TRAN_LO_MAC_DINH;

  async function taiKho(): Promise<void> {
    replaceChildren(khoEl, h("p", { class: "muted" }, "Đang tải…"));
    try {
      const r = await api<{ tranLo: number; kho: KhoDong[] }>("/api/ve/kho");
      tranLo = r.tranLo;
      if (r.kho.length === 0) { replaceChildren(khoEl, h("p", { class: "muted" }, "Kho chưa có vé nào. Nhập lô đầu tiên ở khối bên dưới.")); return; }
      replaceChildren(khoEl, h("ul", { class: "pay-list", "data-khoi": "ton-kho" }, ...r.kho.map((d) =>
        h("li", { "data-ma": d.catalogCode },
          h("strong", null, `${d.tenDichVu ?? d.catalogCode} · ${NHAN_NHOM[d.nhomKhach] ?? d.nhomKhach}`),
          h("p", { class: "muted" }, `Còn trống ${d.conTrong} · sắp hết hạn (7 ngày) ${d.sapHetHan} · đã giữ cho đơn ${d.daGiu} · đã giao ${d.daGiao}`)))));
    } catch (err) {
      replaceChildren(khoEl, h("p", { class: "alert", role: "alert" }, lyDoLoi(err)));
    }
  }

  /** Một vé trong khối Lô đã huỷ gần đây. Mở lần đầu qua hộp báo trước vì vé bị khoá hẳn; ảnh chỉ hiện sau khi máy chủ đã ghi khoá. */
  function dongVeDaHuy(v: VeDaHuy): HTMLElement {
    const khuAnh = h("div", { "data-anh": v.veId });
    const hienAnh = async (): Promise<void> => {
      const r = await fetch(`/api/ve/lo-da-huy/${encodeURIComponent(v.veId)}/anh`, { credentials: "same-origin" });
      if (!r.ok) throw new Error("Không tải được ảnh vé.");
      replaceChildren(khuAnh, h("img", { class: "ve-anh-xem", src: URL.createObjectURL(await r.blob()), alt: `Ảnh vé số cuối ${v.duoiMa}` }));
    };
    const baoLoi = (err: unknown): void => showError(errorEl, err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Không kết nối được máy chủ.");
    const nutXem = (): HTMLElement => {
      const nut = h("button", { type: "button", class: "btn", "data-action": "xem-anh", "data-id": v.veId }, "Xem ảnh");
      nut.addEventListener("click", () => void hienAnh().catch(baoLoi));
      return nut;
    };
    const ghiChu = (t: VeDaHuy["trangThaiAnh"]): string => (t === "DA_NHAP_LAI" ? " · đã nhập lại vào kho nên không mở được ảnh cũ" : t === "HET_ANH" ? " · ảnh đã xoá" : t === "DA_MO" ? " · đã mở, vé bị khoá" : "");
    const moTa = (t: VeDaHuy["trangThaiAnh"]): string => `Vé số cuối ${v.duoiMa} · ${ngayDung(v.tuNgay, v.denNgay)}${ghiChu(t)}`;
    const chu = h("p", { class: "muted" }, moTa(v.trangThaiAnh));
    const khu = h("div", { class: "handler-actions" });
    if (v.trangThaiAnh === "DA_MO") replaceChildren(khu, nutXem());
    if (v.trangThaiAnh === "CHUA_MO") {
      const nut = h("button", { type: "button", class: "btn", "data-action": "mo-anh", "data-id": v.veId }, "Mở ảnh");
      nut.addEventListener("click", async () => {
        const dongY = await hoiXacNhan({ tieuDe: "Mở ảnh vé này?", hauQua: "Vé đã mở sẽ bị khoá hẳn: không nhập lại vào kho để bán được nữa và không hoàn tác được. Lần mở được ghi vào nhật ký.", nhanNguyHiem: "Mở ảnh", opener: nut });
        if (!dongY) return;
        nut.disabled = true;
        try {
          await api(`/api/ve/lo-da-huy/${encodeURIComponent(v.veId)}/mo`, { method: "POST", body: {} });
          chu.textContent = moTa("DA_MO");
          replaceChildren(khu, nutXem());
          await hienAnh();
        } catch (err) {
          baoLoi(err);
          await taiLoDaHuy();
        }
      });
      replaceChildren(khu, nut);
    }
    return h("div", { "data-ve": v.trangThaiAnh }, chu, khu, khuAnh);
  }

  async function taiLoDaHuy(): Promise<void> {
    try {
      const r = await api<{ hanLuuNgay: number; lo: LoDaHuy[] }>("/api/ve/lo-da-huy");
      if (r.lo.length === 0) { replaceChildren(daHuyEl, h("p", { class: "muted" }, `Không có lô nào được huỷ trong ${r.hanLuuNgay} ngày qua.`)); return; }
      replaceChildren(daHuyEl,
        h("p", { class: "muted" }, `Các lô huỷ trong ${r.hanLuuNgay} ngày qua, để tra cứu. Mở ảnh một vé thì vé đó bị khoá, không nhập lại vào kho được nữa.`),
        h("ul", { class: "pay-list", "data-khoi": "lo-da-huy" }, ...r.lo.map((l) =>
          h("li", { "data-lo": l.loId },
            h("strong", null, l.tenSanPham),
            h("p", { class: "muted" }, `${l.tenDichVu ?? "Dịch vụ không còn trong danh mục"} · ${NHAN_NHOM[l.nhomKhach] ?? l.nhomKhach} · ${l.ve.length} vé`),
            h("p", { class: "muted" }, `Huỷ lúc ${gioVn(l.huyLuc)} ngày ${ngayVn(l.huyLuc)} · người huỷ: ${l.huyBoi ?? "không rõ"}`),
            h("details", { class: "px-hop" }, h("summary", null, `Xem ${l.ve.length} vé`),
              ...l.ve.map(dongVeDaHuy))))));
    } catch (err) {
      replaceChildren(daHuyEl, h("p", { class: "alert", role: "alert" }, lyDoLoi(err)));
    }
  }

  async function taiCacLo(): Promise<void> {
    try {
      const r = await api<{ lo: LoBoDuoc[] }>("/api/ve/lo");
      if (r.lo.length === 0) { replaceChildren(cacLoEl, h("p", { class: "muted" }, "Không có lô nào.")); return; }
      replaceChildren(cacLoEl, h("ul", { class: "pay-list", "data-khoi": "cac-lo" }, ...r.lo.map((l) => {
        const nut = h("button", { type: "button", class: "btn", "data-action": "bo-lo", "data-id": l.loId }, "Huỷ lô");
        nut.addEventListener("click", async () => {
          const dongY = await hoiXacNhan({ tieuDe: "Huỷ lô vé này?", hauQua: `${l.soVe} vé của lô sẽ bị gỡ khỏi kho. Ảnh được lưu thêm ${NGAY_LUU_ANH_LO_HUY} ngày rồi tự xoá. Muốn dùng lại thì nhập đúng các ảnh đó trong lô mới.`, nhanNguyHiem: "Huỷ lô", opener: nut });
          if (!dongY) return;
          nut.disabled = true;
          hienOk(null);
          try {
            await api(`/api/ve/lo/${encodeURIComponent(l.loId)}/bo`, { method: "POST", body: {} });
            hienOk("Đã huỷ lô.");
            await Promise.all([taiKho(), taiCacLo(), taiLoDaHuy()]);
          } catch (err) {
            showError(errorEl, lyDoLoi(err));
            nut.disabled = false;
          }
        });
        return h("li", { "data-lo": l.loId },
          h("strong", null, l.tenSanPham),
          h("p", { class: "muted" }, `${l.tenDichVu ?? "Dịch vụ không còn trong danh mục"} · ${NHAN_NHOM[l.nhomKhach] ?? l.nhomKhach} · ${l.trangThai === "PENDING" ? "đang dở" : "đã vào kho"} · ${l.soVe} vé · tạo ${ngayVn(l.taoLuc)}`),
          h("div", { class: "handler-actions" }, nut));
      })));
    } catch (err) {
      replaceChildren(cacLoEl, h("p", { class: "alert", role: "alert" }, lyDoLoi(err)));
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
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const trangThai = h("p", { class: "muted", role: "status", hidden: true });
    const nutGui = h("button", { type: "submit", class: "btn btn-primary", "data-action": "nhap-lo" }, "Nhập lô vé");
    const truong = (nhan: string, id: string, o: HTMLElement) => h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: id }, nhan), o);
    const baoLoi = (cau: string): void => { loi.textContent = cau; loi.hidden = false; };

    const form = h("form", { id: "vk-form", novalidate: false },
      loiDanhMuc ? h("p", { class: "alert", role: "alert" }, loiDanhMuc) : null,
      truong("Dịch vụ", "vk-dich-vu", chonDv), truong("Loại khách", "vk-nhom", chonNhom), truong("Tên sản phẩm in trên vé", "vk-ten-sp", tenSp),
      truong("Dùng từ ngày (chung cho cả lô)", "vk-tu-ngay", tuNgay), truong("Dùng đến ngày (chung cho cả lô)", "vk-den-ngay", denNgay),
      truong(`Ảnh vé (JPG hoặc PNG, mỗi ảnh tối đa 3 MB, mỗi lô tối đa ${tranLo} ảnh)`, "vk-tep", tep),
      h("p", { class: "muted" }, "Máy tự đọc mã QR trên từng ảnh để chống trùng, nhưng không đọc ngày hay loại vé. Mỗi lô chỉ chọn vé cùng một sản phẩm, cùng loại khách và cùng ngày dùng."),
      loi, trangThai, h("div", { class: "handler-actions" }, nutGui));

    tep.addEventListener("change", () => {
      const so = tep.files?.length ?? 0;
      loi.hidden = true;
      if (so > tranLo) baoLoi(cauVuotTran(tranLo, so));
    });

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      loi.hidden = true; hienOk(null);
      const tepDs = [...(tep.files ?? [])];
      if (tepDs.length === 0) { baoLoi("Chọn ít nhất một ảnh vé."); return; }
      if (tepDs.length > tranLo) { baoLoi(cauVuotTran(tranLo, tepDs.length)); return; }
      nutGui.disabled = true;
      trangThai.hidden = false;
      const bi: string[] = [];
      try {
        // Đọc tuần tự, nhường lượt vẽ giữa hai ảnh: bộ đọc chạy đồng bộ, đọc dồn sẽ làm trang đứng hình.
        const daDoc: { ten: string; chuoiQr: string | null; byte: number; tep: File }[] = [];
        for (const [i, t] of tepDs.entries()) {
          trangThai.textContent = `Đang đọc mã trên ảnh ${i + 1}/${tepDs.length}…`;
          await new Promise((xong) => setTimeout(xong));
          daDoc.push({ ten: t.name, chuoiQr: t.size > TOI_DA_BYTE_ANH ? null : await docQrTuTep(t), byte: t.size, tep: t });
        }
        const loc = locAnhDaDoc(daDoc);
        for (const b of loc.bi) bi.push(`${b.ten}: ${b.lyDo}`);
        if (loc.hop.length === 0) { baoLoi(bi.join(" ")); trangThai.textContent = "Chưa có vé nào vào kho. Chưa tạo lô."; return; }

        const lo = await api<{ loId: string }>("/api/ve/lo", { method: "POST", body: { catalogCode: chonDv.value, nhomKhach: chonNhom.value, tenSanPham: tenSp.value, soVeDuKien: loc.hop.length } });
        try {
          let them = 0;
          for (let i = 0; i < loc.hop.length; i += TOI_DA_VE_MOI_DOT) {
            const doan = loc.hop.slice(i, i + TOI_DA_VE_MOI_DOT);
            trangThai.textContent = `Đang gửi ${Math.min(i + doan.length, loc.hop.length)}/${loc.hop.length} ảnh…`;
            const ve = await Promise.all(doan.map(async (a) => ({ noiDung: await docBase64(a.tep), maVe: a.maVe, tuNgay: tuNgay.value, denNgay: denNgay.value })));
            const r = await api<ThemVeRes>(`/api/ve/lo/${encodeURIComponent(lo.loId)}/ve`, { method: "POST", body: { ve } });
            them += r.themDuoc;
            for (const l of r.loai) bi.push(`${doan[l.thuTu]?.ten ?? "Ảnh"}: ${l.lyDo}`);
            if (r.chuaLuuVaoKho > 0) bi.push(`${r.chuaLuuVaoKho} ảnh chưa lưu được vào kho, hãy nhập lại trong lô mới.`);
          }
          if (bi.length > 0) baoLoi(bi.join(" "));
          if (them === 0) {
            await api(`/api/ve/lo/${encodeURIComponent(lo.loId)}/bo`, { method: "POST", body: {} }).catch(() => undefined); // lô trống: không để lại rác ở danh sách
            trangThai.textContent = "Chưa có vé nào vào kho.";
            await Promise.all([taiCacLo(), taiLoDaHuy()]);
            return;
          }
          await api(`/api/ve/lo/${encodeURIComponent(lo.loId)}/xac-nhan`, { method: "POST", body: {} });
          trangThai.hidden = true;
          hienOk(`Đã nhập ${them} vé vào kho.`);
          form.reset();
          await Promise.all([taiKho(), taiCacLo(), taiLoDaHuy()]);
        } catch (err) {
          // Lô đã tạo mà gửi dở: chỉ đường ra thay vì để vé kẹt không ai thấy (ADR-0156 Đ2 mục 3).
          baoLoi(`${[...bi, lyDoLoi(err)].join(" ")} Lô này chưa xong: bấm «Huỷ lô» ở danh sách bên dưới rồi nhập lại.`);
          trangThai.hidden = true;
          await Promise.all([taiCacLo(), taiLoDaHuy()]);
        }
      } catch (err) {
        baoLoi([...bi, lyDoLoi(err)].join(" "));
        trangThai.hidden = true;
      } finally {
        nutGui.disabled = false;
      }
    });
    replaceChildren(loEl, form);
  }

  await taiKho();
  await Promise.all([taiCacLo(), taiLoDaHuy(), dungForm()]);
}
