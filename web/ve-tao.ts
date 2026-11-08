// Khối «Tạo vé» Tour Đảo của trang Vé điện tử (ADR-0175 Đ1.3, Đ1.6, Đ1.7; kế hoạch Task 9). Chỉ hiện cho người giữ ô `ve.phat-hanh`; máy chủ kiểm lại.
// Luồng: POST /api/ve/lo {nguon:"TOUR_DAO"} → mỗi vé: sinh mã bằng crypto.getRandomValues, vẽ ảnh, TỰ ĐỌC LẠI QR phải đúng mã vừa sinh → chỉ khi MỌI vé đạt mới
// gửi theo đoạn POST /api/ve/lo/:id/ve → POST …/xac-nhan. Một vé hỏng thì huỷ lô (POST …/bo), không gửi vé nào.
// Mã vé là bí mật: không hiện, không ghi console, không vào câu báo; người tạo chỉ thấy số lượng. «Tên tiếng Anh» chỉ in lên ảnh, không gửi máy chủ.
import { ApiError, api, type Api } from "./api";
import { taoMaVeTourDao } from "../src/shared/ma-ve-tour-dao";
import { NHOM_KHACH_VE, type NhomLo } from "../src/shared/ve-anh-tour-dao-bo-cuc";
import { TOI_DA_BYTE_ANH, TOI_DA_VE_MOI_DOT } from "../src/shared/ve-nhap-lo";
import { h, replaceChildren } from "./dom";
import { docQrTuTep } from "./qr-doc-ve";
import { veAnhTourDao } from "./ve-anh-tour-dao";

interface ThemVeRes { themDuoc: number; chuaLuuVaoKho: number; loai: { thuTu: number; lyDo: string }[] }
interface XacNhanRes { veTrongLo: number; dichVuKhongVe: boolean; canhBaoNguon: boolean; capBu: number; conDonChuaXet?: boolean }

/** Mã giả cho vé mẫu: đúng dạng nhưng không bao giờ gửi máy chủ. */
const MA_MAU = `TD1.${"A".repeat(22)}MAUV`;
const ngauNhien = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));
/** Câu của máy chủ, hoặc câu tiếng Việt do chính trang ném; lỗi khác của trình duyệt (chữ Anh, mất mạng) thành câu chung. */
const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : err instanceof Error && /[à-ỹđ]/i.test(err.message) ? err.message : "Không kết nối được máy chủ hoặc trình duyệt không vẽ được vé.");
const nhuong = (): Promise<void> => new Promise((xong) => setTimeout(xong));

function blobBase64(b: Blob): Promise<string> {
  return new Promise((xong, hong) => {
    const r = new FileReader();
    r.onload = () => xong(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => hong(new Error("Không đọc được ảnh vé."));
    r.readAsDataURL(b);
  });
}

/** Dịch vụ chọn được: «Có vé» và «Vé do ai phát» = Vé Tour Đảo. Tài khoản không đọc được hai ô đó (chỉ Quản trị, Toàn quyền) thì trả cả danh mục, `daLoc = false`. */
async function taiDichVu(): Promise<{ ds: { code: string; name: string }[]; daLoc: boolean }> {
  const r = await api<Api.CatalogPublicResponse>("/api/catalog");
  const tatCa = r.items.map((i) => ({ code: i.code, name: i.name })).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  try {
    const [co, ng] = await Promise.all([api<Api.CatalogCoVeResponse>("/api/catalog/co-ve"), api<Api.CatalogNguonVeResponse>("/api/catalog/nguon-ve")]);
    const coVe = new Set(co.dichVu.filter((d) => d.coVe).map((d) => d.code));
    const tourDao = new Set(ng.dichVu.filter((d) => d.nguon === "TOUR_DAO").map((d) => d.ma));
    return { ds: tatCa.filter((d) => coVe.has(d.code) && tourDao.has(d.code)), daLoc: true };
  } catch {
    return { ds: tatCa, daLoc: false };
  }
}

export async function dungKhoiTaoVe(khung: HTMLElement, o: { tranLo: () => number; hienOk: (cau: string | null) => void; sauKhiTao: () => Promise<void> }): Promise<void> {
  let dv: { ds: { code: string; name: string }[]; daLoc: boolean };
  try { dv = await taiDichVu(); } catch (err) { replaceChildren(khung, h("p", { class: "alert", role: "alert" }, lyDoLoi(err))); return; }
  if (dv.daLoc && dv.ds.length === 0) {
    replaceChildren(khung, h("p", { class: "muted" }, "Chưa có dịch vụ nào vừa bật «Có vé» vừa chọn «Vé Tour Đảo» ở ô «Vé do ai phát». Quản trị đặt hai ô này ở màn Dịch vụ & giá."));
    return;
  }
  let congTy: { name: string; hotline: string } | null = null;
  const layCongTy = async (): Promise<{ name: string; hotline: string }> => {
    if (congTy) return congTy;
    const r = await api<Api.CompanyResponse>("/api/company");
    if (!r.company.name.trim() || !r.company.hotline.trim()) throw new Error("Hồ sơ công ty chủ thiếu tên hoặc hotline để in lên vé.");
    congTy = { name: r.company.name, hotline: r.company.hotline };
    return congTy;
  };

  const chonDv = h("select", { class: "o", id: "vt-dich-vu", required: true }, h("option", { value: "" }, "Chọn dịch vụ…"), ...dv.ds.map((d) => h("option", { value: d.code }, d.name)));
  const chonNhom = h("select", { class: "o", id: "vt-nhom" }, ...(Object.entries(NHOM_KHACH_VE) as [NhomLo, { vi: string }][]).map(([ma, t]) => h("option", { value: ma }, t.vi)));
  const tuNgay = h("input", { type: "date", class: "o", id: "vt-tu-ngay", required: true });
  const denNgay = h("input", { type: "date", class: "o", id: "vt-den-ngay", required: true });
  const soLuong = h("input", { type: "number", class: "o", id: "vt-so-luong", min: "1", max: String(o.tranLo()), step: "1", inputMode: "numeric", required: true });
  const tenEn = h("input", { type: "text", class: "o", id: "vt-ten-en", maxLength: 120, placeholder: "Ví dụ: Nha Trang 4-Island Tour" });
  const loi = h("p", { class: "alert", role: "alert", hidden: true });
  const trangThai = h("p", { class: "muted", role: "status", hidden: true });
  const khuMau = h("div", { "data-khoi": "ve-mau" });
  const nutMau = h("button", { type: "button", class: "btn", "data-action": "xem-ve-mau" }, "Xem vé mẫu");
  const nutTao = h("button", { type: "submit", class: "btn btn-primary", "data-action": "tao-ve" }, "Tạo vé");
  const truong = (nhan: string, id: string, el: HTMLElement) => h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: id }, nhan), el);
  const baoLoi = (cau: string): void => { loi.textContent = cau; loi.hidden = false; };
  const datBan = (ban: boolean): void => { nutTao.disabled = ban; nutMau.disabled = ban; };

  /** Kiểm ô trên máy trước khi gọi máy chủ; trả câu lỗi hoặc null. */
  const kiemO = (canSoLuong: boolean): string | null => {
    if (!chonDv.value) return "Chọn dịch vụ cho cả lô.";
    if (!tuNgay.value || !denNgay.value) return "Chọn ngày dùng từ và đến cho cả lô.";
    if (denNgay.value < tuNgay.value) return "Ngày dùng đến phải sau hoặc bằng ngày dùng từ.";
    if (!canSoLuong) return null;
    const so = Number(soLuong.value);
    if (!Number.isInteger(so) || so < 1) return "Nhập số vé cần tạo, ít nhất 1.";
    if (so > o.tranLo()) return `Một lô tối đa ${o.tranLo()} vé.`;
    return null;
  };
  const noiDung = async (ma: string) => {
    const ct = await layCongTy();
    return { tenCongTy: ct.name, hotline: ct.hotline, tenDichVu: chonDv.selectedOptions[0]?.textContent ?? "", tenDichVuEn: tenEn.value.trim() || null, nhomKhach: chonNhom.value as NhomLo, denNgay: denNgay.value, ma };
  };

  nutMau.addEventListener("click", async () => {
    loi.hidden = true;
    const sai = kiemO(false);
    if (sai) { baoLoi(sai); return; }
    datBan(true);
    try {
      const anh = await veAnhTourDao(await noiDung(MA_MAU));
      replaceChildren(khuMau,
        h("img", { class: "ve-anh-xem ve-mau", src: URL.createObjectURL(anh), alt: "Vé mẫu" }),
        h("p", { class: "muted" }, "Vé mẫu dùng mã giả, không quét được và không gửi lên máy chủ. Vé thật có mã riêng cho từng vé."));
    } catch (err) {
      baoLoi(lyDoLoi(err));
    } finally {
      datBan(false);
    }
  });

  const form = h("form", { id: "vt-form" },
    dv.daLoc ? null : h("p", { class: "muted" }, "Danh sách gồm mọi dịch vụ vì tài khoản này không xem được ô «Vé do ai phát». Chọn đúng dịch vụ dùng vé Tour Đảo; chọn nhầm thì máy báo ngay sau khi tạo."),
    truong("Dịch vụ", "vt-dich-vu", chonDv), truong("Loại khách", "vt-nhom", chonNhom),
    truong("Dùng từ ngày (chung cho cả lô)", "vt-tu-ngay", tuNgay), truong("Dùng đến ngày, in trên vé là hạn cuối", "vt-den-ngay", denNgay),
    truong(`Số vé (mỗi lô tối đa ${o.tranLo()} vé)`, "vt-so-luong", soLuong),
    truong("Tên tiếng Anh của dịch vụ (không bắt buộc, chỉ in lên vé, không lưu)", "vt-ten-en", tenEn),
    h("p", { class: "muted" }, "Máy tự vẽ từng vé với mã riêng, tự đọc lại mã trên ảnh rồi mới đưa vào kho. Bạn không thấy mã vé; khách nhận vé qua đơn như vé thường."),
    loi, trangThai, khuMau, h("div", { class: "handler-actions" }, nutMau, nutTao));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    loi.hidden = true; o.hienOk(null);
    const sai = kiemO(true);
    if (sai) { baoLoi(sai); return; }
    const so = Number(soLuong.value);
    datBan(true);
    trangThai.hidden = false;
    let loId: string | null = null;
    let daGoiXacNhan = false; // lệnh đưa vào kho có thể đã thành ở máy chủ dù mất phản hồi: khi đó KHÔNG tự huỷ lô
    const huyLo = async (): Promise<boolean> => {
      if (!loId) return true;
      try { await api(`/api/ve/lo/${encodeURIComponent(loId)}/bo`, { method: "POST", body: {} }); return true; } catch { return false; }
    };
    try {
      const mau = await noiDung(MA_MAU); // tải hồ sơ công ty TRƯỚC khi mở lô: thiếu thì dừng, không để lô rỗng
      trangThai.textContent = "Đang mở lô…";
      loId = (await api<{ loId: string }>("/api/ve/lo", { method: "POST", body: { catalogCode: chonDv.value, nhomKhach: chonNhom.value, tenSanPham: mau.tenDichVu, nguon: "TOUR_DAO", soVeDuKien: so } })).loId;

      // Vẽ và tự đọc lại MỌI vé trước khi gửi vé nào.
      const ve: { ma: string; anh: Blob }[] = [];
      const daSinh = new Set<string>();
      for (let i = 0; i < so; i++) {
        trangThai.textContent = `Đang vẽ và tự kiểm vé ${i + 1}/${so}…`;
        await nhuong();
        let ma = taoMaVeTourDao(ngauNhien);
        while (daSinh.has(ma)) ma = taoMaVeTourDao(ngauNhien);
        daSinh.add(ma);
        const anh = await veAnhTourDao({ ...mau, ma });
        const doc = anh.size > TOI_DA_BYTE_ANH ? null : await docQrTuTep(new File([anh], "ve.png", { type: "image/png" }));
        if (doc !== ma) {
          const daHuy = await huyLo();
          baoLoi(anh.size > TOI_DA_BYTE_ANH
            ? `Ảnh vé thứ ${i + 1} nặng quá 3 MB. ${daHuy ? "Đã huỷ lô, chưa có vé nào vào kho." : "Lô chưa xong: bấm «Huỷ lô» ở danh sách bên dưới."}`
            : `Máy không đọc lại được mã trên vé thứ ${i + 1}. ${daHuy ? "Đã huỷ lô, chưa có vé nào vào kho." : "Lô chưa xong: bấm «Huỷ lô» ở danh sách bên dưới."} Thử lại; lặp lại thì báo Toàn quyền.`);
          trangThai.hidden = true;
          return;
        }
        ve.push({ ma, anh });
      }

      let them = 0;
      const bi: string[] = [];
      for (let i = 0; i < ve.length; i += TOI_DA_VE_MOI_DOT) {
        const doan = ve.slice(i, i + TOI_DA_VE_MOI_DOT);
        trangThai.textContent = `Đang gửi ${Math.min(i + doan.length, ve.length)}/${ve.length} vé…`;
        const than = await Promise.all(doan.map(async (v) => ({ noiDung: await blobBase64(v.anh), maVe: v.ma, tuNgay: tuNgay.value, denNgay: denNgay.value })));
        const r = await api<ThemVeRes>(`/api/ve/lo/${encodeURIComponent(loId)}/ve`, { method: "POST", body: { ve: than } });
        them += r.themDuoc;
        for (const l of r.loai) bi.push(`Vé thứ ${i + l.thuTu + 1}: ${l.lyDo}`);
        if (r.chuaLuuVaoKho > 0) bi.push(`${r.chuaLuuVaoKho} vé chưa lưu được vào kho.`);
      }
      ve.length = 0;
      if (them === 0) {
        const daHuy = await huyLo();
        baoLoi(`${bi.join(" ")} ${daHuy ? "Chưa có vé nào vào kho, đã huỷ lô." : "Chưa có vé nào vào kho: bấm «Huỷ lô» ở danh sách bên dưới."}`.trim());
        trangThai.hidden = true;
        await o.sauKhiTao();
        return;
      }
      trangThai.textContent = "Đang đưa lô vào kho…";
      daGoiXacNhan = true;
      const xn = await api<XacNhanRes>(`/api/ve/lo/${encodeURIComponent(loId)}/xac-nhan`, { method: "POST", body: {} });
      trangThai.hidden = true;
      if (bi.length > 0) baoLoi(bi.join(" "));
      // ADR-0175 Đ1.5a: dịch vụ đang tắt «Có vé» hoặc dùng vé của nguồn khác ⇒ lô chưa được cấp cho ai.
      const canh = xn.dichVuKhongVe ? " Dịch vụ này đang tắt ô «Có vé» nên máy chưa giữ vé cho đơn. Hãy báo Quản trị bật ô này ở màn Dịch vụ & giá."
        : xn.canhBaoNguon ? " Lô chưa được cấp cho ai tới khi Quản trị đổi ô «Vé do ai phát»." : "";
      o.hienOk(`Đã tạo ${them} vé vào kho.${xn.capBu > 0 ? ` Máy đã cấp bù vé cho ${xn.capBu} đơn đang thiếu.` : ""}${xn.conDonChuaXet ? " Còn đơn đang thiếu vé chưa được cấp bù trong lần này." : ""}${canh}`);
      form.reset();
      replaceChildren(khuMau);
      await o.sauKhiTao();
    } catch (err) {
      const daHuy = loId && !daGoiXacNhan ? await huyLo() : false;
      baoLoi(`${lyDoLoi(err)}${!loId ? "" : daHuy ? " Đã huỷ lô, chưa có vé nào vào kho." : daGoiXacNhan ? " Xem lại số vé ở khối «Số vé còn» và danh sách lô bên dưới trước khi tạo lại." : " Lô chưa xong: bấm «Huỷ lô» ở danh sách bên dưới rồi tạo lại."}`);
      trangThai.hidden = true;
      if (loId) await o.sauKhiTao();
    } finally {
      datBan(false);
    }
  });
  replaceChildren(khung, form);
}
