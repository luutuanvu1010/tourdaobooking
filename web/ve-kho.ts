// Trang "Vé điện tử" (ADR-0153, ADR-0156). Gọi các route của module ve-dien-tu:
//   GET  /api/ve/kho                    → số vé theo dịch vụ + loại khách (chỉ ĐẾM) và trần lô đang áp
//   GET  /api/ve/lo?tatCa=1             → mọi lô chưa huỷ, mỗi lô kèm `daCap` (ADR-0217); bỏ tham số thì chỉ lô chưa từng cấp
//   GET  /api/ve/lo/:id/xem-truoc-huy   → con số trước khi huỷ lô đã cấp (huỷ được, giữ nguyên, đơn cấp thay, vé đã gửi)
//   POST /api/ve/lo/:id/bo              → huỷ lô; lô đã cấp thì bắt buộc `lyDo` (web/ve-kho-huy.ts lo ô lý do, danh sách vé, «Huỷ vé», tìm số sê-ri)
//   GET  /api/ve/lo-da-huy              → các lô huỷ trong hạn lưu ảnh, mỗi vé kèm trạng thái ảnh
//   POST /api/ve/lo-da-huy/:veId/mo     → mở ảnh: vé bị khoá hẳn, không nhập lại được
//   GET  /api/ve/lo-da-huy/:veId/anh    → ảnh của vé đã mở
//   POST /api/ve/lo                     → mở lô (một dịch vụ + một loại khách hoặc mọi loại khách + tên sản phẩm, chọn MỘT lần cho cả lô); vượt trần ⇒ 400, không tạo lô
//   POST /api/ve/lo/:id/ve              → thêm ảnh vé (JSON base64, tối đa 10 ảnh mỗi đợt, JPG/PNG ≤ 3 MB)
//   POST /api/ve/lo/:id/xac-nhan        → đưa lô vào kho
//   POST /api/ve/lo/:id/bo              → huỷ lô; ảnh vé của lô nhập lại được
// Mã vé do máy đọc từ QR trên từng ảnh, ngay trên trình duyệt (ADR-0156 Đ1); ảnh không đọc được thì loại riêng, không có đường nhập tay. Khoảng ngày dùng chung cho cả lô.
// Phản hồi của máy chủ chỉ có 4 số cuối mã — trang không bao giờ hiện mã đầy đủ.
// Ẩn/hiện hỏi bảng quyền (ADR-0175 Đ1.4): trang mở cho `ve.kho.manage` hoặc `ve.phat-hanh`; khối nhập lô (vé hãng ngoài) chỉ `ve.kho.manage`; khối «Tạo vé» (vé Tour Đảo,
// web/ve-tao.ts) chỉ `ve.phat-hanh`; nút «Huỷ lô» theo nguồn của lô. Máy chủ vẫn kiểm lại. Không `innerHTML` (dựng bằng `h()`).
// Bộ lọc dùng chung (kế hoạch 16 việc 21/11, Việc 4): MỘT thanh lọc đầu trang (web/loc-dich-vu-kho-ui.ts: nhóm dịch vụ + chữ tìm không dấu, luật src/shared/loc-dich-vu-kho.ts) áp cho
// «Số vé còn» và «Lô đã huỷ gần đây» ngay trên dữ liệu đã tải, còn «Lô trong kho» (chia trang 50) gửi điều kiện lên GET /api/ve/lo?tatCa=1. Danh mục /api/catalog tải MỘT lần cho
// cả trang: bảng mã → nhóm của thanh lọc, bộ chọn dịch vụ của bước nhập lô và của Tạo vé.
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { NHOM_SO_VE, demTheoNhom, locKhoVe, type NhomSoVe } from "../src/shared/loc-kho-ve";
import { bangNhomTheoMa, coChuaPhanLoai, dangLoc, dieuKienLo, khopBoLoc, thamSoLo, type BangNhom } from "../src/shared/loc-dich-vu-kho";
import { CHUA_PHAN_LOAI } from "../src/shared/loc-danh-muc";
import { taoThanhLocDv } from "./loc-dich-vu-kho-ui";
import { NGAY_LUU_ANH_LO_HUY, TOI_DA_BYTE_ANH, TOI_DA_VE_MOI_DOT, TRAN_LO_MAC_DINH, cauVuotTran, locAnhDaDoc } from "../src/shared/ve-nhap-lo";
import { hoiXacNhan } from "./bang-truot";
import { createCatalogPicker } from "./catalog-picker";
import { byId, h, replaceChildren } from "./dom";
import { trangThaiHeThong } from "./trang-thai-he-thong";
import { docQrTuTep } from "./qr-doc-ve";
import { initShell, showError } from "./shell";
import { dungKhoiTaoVe } from "./ve-tao";
import { hopHuyCoLyDo, khoiTimVe, thanhTrang, veCuaLo, type VeTrongLo } from "./ve-kho-huy";

type Nguon = "HANG_NGOAI" | "TOUR_DAO";
interface KhoDong { catalogCode: string; tenDichVu: string | null; nhomKhach: "ADULT" | "CHILD" | "SENIOR" | "ALL"; nguon: Nguon; conTrong: number; sapHetHan: number; daGiu: number; daGiao: number }
interface ThemVeRes { loId: string; themDuoc: number; chuaLuuVaoKho: number; loai: { thuTu: number; lyDo: string }[]; veTrongLo: number }
interface LoBoDuoc { loId: string; catalogCode: string; tenDichVu: string | null; nhomKhach: string; tenSanPham: string; nguon: Nguon; trangThai: string; soVe: number; taoLuc: string; daCap?: boolean }
interface XemTruocHuy { daCap: boolean; tongVe: number; huyDuoc: number; giuNguyenDaDung: number; giuNguyenHangNgoaiDaMo: number; donCapThay: number; daGuiPhaiGuiLai: number }
interface HuyLoRes { veDaHuy: number; veGiuNguyen: { daDung: number; hangNgoaiDaMo: number }; donXetCapThay: number; conDonChuaCapThay: boolean; canGuiLai: number }

interface VeDaHuy { veId: string; duoiMa: string; tuNgay: string; denNgay: string; trangThaiAnh: "CHUA_MO" | "DA_MO" | "DA_NHAP_LAI" | "HET_ANH" }
interface LoDaHuy { loId: string; catalogCode: string; tenDichVu: string | null; nhomKhach: string; tenSanPham: string; huyLuc: string; huyBoi: string | null; ve: VeDaHuy[] }

const NHAN_NHOM: Record<string, string> = { ADULT: "Người lớn", CHILD: "Trẻ em", SENIOR: "Cao tuổi", ALL: "Mọi loại khách" };
/** Nhãn ô «Vé do ai phát» của từng dòng: hai dòng cùng dịch vụ khác nguồn không trông giống nhau. */
const NHAN_NGUON: Record<Nguon, string> = { HANG_NGOAI: "Vé hãng ngoài", TOUR_DAO: "Vé Tour Đảo" };

const errorEl = byId("error");
const okEl = byId("ok");
const noiDungEl = byId("vk-noi-dung");
const locEl = byId("vk-loc");
const khoEl = byId("vk-kho");
const loEl = byId("vk-lo");
const cacLoEl = byId("vk-cac-lo");
const daHuyEl = byId("vk-da-huy");
const khoiLoEl = byId("vk-khoi-lo");
const khoiTaoEl = byId("vk-khoi-tao");
const taoEl = byId("vk-tao");
const guiLaiEl = byId("vk-gui-lai");
const timEl = byId("vk-tim");

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

const nhapLo = can(staff, "ve.kho.manage");
const taoVe = can(staff, "ve.phat-hanh");
/** Thao tác lô theo nguồn của lô (ADR-0175 Đ1.4): Bán hàng thường xem được lô Tour Đảo nhưng không huỷ được. */
const thaoTacLo = (nguon: Nguon): boolean => (nguon === "TOUR_DAO" ? taoVe : nhapLo);
/** Huỷ KHÔNG quay lại được với vé / lô hãng ngoài đã từng cấp cho đơn: thêm ô `ve.huy-hang-ngoai` (chủ chốt 18/11; ADR-0217 Đ3). Lô hãng ngoài chưa từng cấp vẫn huỷ bằng `ve.kho.manage`. */
const huyHangNgoai = can(staff, "ve.huy-hang-ngoai");
const huyVeDuoc = (nguon: Nguon): boolean => (nguon === "TOUR_DAO" ? taoVe : huyHangNgoai);
const huyLoDuoc = (l: { nguon: Nguon; daCap?: boolean }): boolean => (l.nguon === "TOUR_DAO" ? taoVe : nhapLo && (!l.daCap || huyHangNgoai));

if (!nhapLo && !taoVe) {
  showError(errorEl, "Trang Vé điện tử chỉ Bán hàng, Kế toán, Quản lý bán hàng, Quản trị và Toàn quyền dùng được.");
} else {
  noiDungEl.hidden = false;
  khoiLoEl.hidden = !nhapLo;
  khoiTaoEl.hidden = !taoVe;
  let tranLo = TRAN_LO_MAC_DINH;

  // Danh mục dịch vụ: tải MỘT lần, song song với kho. Thanh lọc chỉ cần bảng mã → nhóm khi người dùng chọn một nhóm (hàng nhóm hiện sau khi danh mục về).
  const danhMucHua = api<Api.CatalogPublicResponse>("/api/catalog").then((r) => ({ r, loi: null as string | null }), (err: unknown) => ({ r: null, loi: lyDoLoi(err) }));
  let danhMuc: Api.CatalogPublicResponse | null = null;
  let bang: BangNhom = new Map();
  let khoDaTai: KhoDong[] | null = null;
  let daHuyDaTai: { hanLuuNgay: number; lo: LoDaHuy[] } | null = null;
  const thanhLoc = taoThanhLocDv({ onDoi: () => { if (khoDaTai?.length) veKho(khoDaTai); veLoDaHuy(); trangLo = 1; void taiCacLo(); } }); // kho rỗng: giữ câu «Kho chưa có vé nào…», không thành «không khớp bộ lọc»
  const loiDanhMucEl = h("p", { class: "muted", hidden: true });
  replaceChildren(locEl, thanhLoc.root, loiDanhMucEl);
  /** Nút nhóm: nhóm của danh mục; «Chưa phân loại» khi danh mục có dịch vụ không nhóm hoặc kho / lô đã huỷ có mã đã rời danh mục. */
  const capNhatHangNhom = (): void => {
    if (!danhMuc) return;
    thanhLoc.datNhom(danhMuc.groups, coChuaPhanLoai(bang, [...(khoDaTai ?? []).map((d) => d.catalogCode), ...(daHuyDaTai?.lo ?? []).map((l) => l.catalogCode)]));
  };
  const tenNhomLoc = (ma: string): string => (ma === CHUA_PHAN_LOAI ? "Chưa phân loại" : (danhMuc?.groups.find((g) => g.code === ma)?.name ?? ma));
  /** Dòng nhắc đang lọc ở đầu mỗi khối (khối nằm xa thanh lọc). */
  const dongDangLoc = (): HTMLElement | null => {
    const l = thanhLoc.giaTri();
    if (!dangLoc(l)) return null;
    const phan = [l.nhom ? `nhóm «${tenNhomLoc(l.nhom)}»` : "", l.tim.trim() ? `chữ «${l.tim.trim()}»` : ""].filter(Boolean);
    return h("p", { class: "muted vk-dang-loc", "data-khoi": "dang-loc" }, `Đang lọc theo ${phan.join(" và ")} (thanh lọc ở đầu trang).`);
  };
  /** Khối lọc ra rỗng: câu báo + «Xoá lọc» (khác câu «chưa có gì» khi không lọc). */
  const rongDoLoc = (cau: string, thongBao?: () => void): HTMLElement => {
    const nut = thanhLoc.nutXoaLoc();
    if (thongBao) nut.addEventListener("click", thongBao);
    return h("div", { class: "vk-rong-loc", "data-khoi": "rong-do-loc" }, h("p", { class: "muted", role: "status" }, cau), h("div", { class: "handler-actions" }, nut));
  };

  // Bộ lọc «Số vé còn» (đặc tả 2026-11-20, H4): bốn nút theo số vé còn trống, lọc ngay trên dữ liệu đã tải; lựa chọn giữ qua các lần tải lại kho. Ô tìm riêng của H4 đã gộp vào
  // thanh lọc chung đầu trang (Việc 4): dòng phải khớp thanh lọc trước, bốn nút đếm trên phần còn lại.
  const locKho: { tim: string; nhom: NhomSoVe } = { tim: "", nhom: "tat-ca" };
  function veKho(khoTho: KhoDong[]): void {
    const loc = thanhLoc.giaTri();
    const kho = khoTho.filter((d) => khopBoLoc({ ma: d.catalogCode, chu: [d.tenDichVu] }, loc, bang));
    const hangNut = h("div", { class: "loc-nut-hang" });
    const dsEl = h("div", { "data-khoi": "ton-kho-ds" });
    const ve = (): void => {
      const dem = demTheoNhom(kho, locKho.tim);
      replaceChildren(hangNut, ...NHOM_SO_VE.map((n) => {
        const b = h("button", { type: "button", class: "loc-nut", "aria-pressed": String(locKho.nhom === n.ma), "data-loc-nhom": n.ma }, `${n.nhan} (${dem[n.ma]})`);
        b.addEventListener("click", () => { locKho.nhom = n.ma; ve(); hangNut.querySelector<HTMLElement>(`[data-loc-nhom="${n.ma}"]`)?.focus(); });
        return b;
      }));
      const khop = locKhoVe(kho, locKho);
      replaceChildren(dsEl, khop.length === 0
        ? (dangLoc(loc) || locKho.nhom !== "tat-ca" ? rongDoLoc("Không có dòng nào khớp bộ lọc.", () => { locKho.nhom = "tat-ca"; veKho(khoDaTai ?? khoTho); }) : h("p", { class: "muted", role: "status" }, "Không có dòng nào khớp bộ lọc."))
        : h("ul", { class: "pay-list", "data-khoi": "ton-kho" }, ...khop.map((d) =>
          h("li", { "data-ma": d.catalogCode },
            h("strong", null, `${d.tenDichVu ?? d.catalogCode} · ${NHAN_NHOM[d.nhomKhach] ?? d.nhomKhach} · ${NHAN_NGUON[d.nguon] ?? d.nguon}`),
            h("p", { class: "muted" }, `Còn trống ${d.conTrong} · sắp hết hạn (7 ngày) ${d.sapHetHan} · đã giữ cho đơn ${d.daGiu} · đã giao ${d.daGiao}`)))));
    };
    replaceChildren(khoEl,
      dongDangLoc(),
      h("div", { class: "vk-loc", "data-khoi": "loc-kho" },
        h("fieldset", { class: "loc-nhom" }, h("legend", null, "Số vé còn"), hangNut)),
      dsEl);
    ve();
  }

  async function taiKho(): Promise<void> {
    replaceChildren(khoEl, h("p", { class: "muted" }, "Đang tải…"));
    try {
      const r = await api<{ tranLo: number; kho: KhoDong[] }>("/api/ve/kho");
      tranLo = r.tranLo;
      khoDaTai = r.kho;
      capNhatHangNhom();
      if (r.kho.length === 0) { replaceChildren(khoEl, h("p", { class: "muted" }, nhapLo || taoVe ? "Kho chưa có vé nào. Nhập lô đầu tiên ở khối bên dưới." : "Kho chưa có vé nào.")); return; }
      veKho(r.kho);
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
          v.trangThaiAnh = "DA_MO"; // dữ liệu đã tải cũng đổi: đổi bộ lọc vẽ lại khối thì vé vẫn hiện «Xem ảnh», không hỏi mở lần nữa
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

  /** Vẽ «Lô đã huỷ gần đây» từ dữ liệu đã tải, theo thanh lọc (tên dịch vụ, mã, tên in trên vé). */
  function veLoDaHuy(): void {
    const r = daHuyDaTai;
    if (!r) return;
    if (r.lo.length === 0) { replaceChildren(daHuyEl, h("p", { class: "muted" }, `Không có lô nào được huỷ trong ${r.hanLuuNgay} ngày qua.`)); return; }
    const loc = thanhLoc.giaTri();
    const khop = r.lo.filter((l) => khopBoLoc({ ma: l.catalogCode, chu: [l.tenDichVu, l.tenSanPham] }, loc, bang));
    replaceChildren(daHuyEl,
      h("p", { class: "muted" }, `Các lô huỷ trong ${r.hanLuuNgay} ngày qua, để tra cứu. Mở ảnh một vé thì vé đó bị khoá, không nhập lại vào kho được nữa.`),
      dongDangLoc(),
      khop.length === 0 ? rongDoLoc("Không có lô đã huỷ nào khớp bộ lọc.") :
        h("ul", { class: "pay-list", "data-khoi": "lo-da-huy" }, ...khop.map((l) =>
          h("li", { "data-lo": l.loId, "data-ma": l.catalogCode },
            h("strong", null, l.tenSanPham),
            h("p", { class: "muted" }, `${l.tenDichVu ?? "Dịch vụ không còn trong danh mục"} · ${NHAN_NHOM[l.nhomKhach] ?? l.nhomKhach} · ${l.ve.length} vé`),
            h("p", { class: "muted" }, `Huỷ lúc ${gioVn(l.huyLuc)} ngày ${ngayVn(l.huyLuc)} · người huỷ: ${l.huyBoi ?? "không rõ"}`),
            h("details", { class: "px-hop" }, h("summary", null, `Xem ${l.ve.length} vé`),
              ...l.ve.map(dongVeDaHuy))))));
  }

  async function taiLoDaHuy(): Promise<void> {
    try {
      daHuyDaTai = await api<{ hanLuuNgay: number; lo: LoDaHuy[] }>("/api/ve/lo-da-huy");
      capNhatHangNhom();
      veLoDaHuy();
    } catch (err) {
      replaceChildren(daHuyEl, h("p", { class: "alert", role: "alert" }, lyDoLoi(err)));
    }
  }

  /** Câu «văn phòng phải gửi lại vé»: đứng yên tới khi người dùng thao tác tiếp (không tự mất như dòng «Đã huỷ…»). */
  const hienGuiLai = (cau: string | null): void => { guiLaiEl.textContent = cau ?? ""; guiLaiEl.hidden = !cau; };
  const lamMoi = async (): Promise<void> => { await Promise.all([taiKho(), taiCacLo(), taiLoDaHuy()]); };
  const sauHuyVe = async (ok: string, guiLai: string | null): Promise<void> => { hienOk(ok); hienGuiLai(guiLai); await lamMoi(); };

  /** «Huỷ lô»: lô chưa từng cấp huỷ như cũ (không cần lý do); lô đã cấp hiện con số do máy chủ đếm và bắt buộc lý do. */
  async function huyLo(l: LoBoDuoc, nut: HTMLElement): Promise<void> {
    hienOk(null); hienGuiLai(null);
    if (!l.daCap) {
      const dongY = await hoiXacNhan({ tieuDe: "Huỷ lô vé này?", hauQua: `${l.soVe} vé của lô sẽ bị gỡ khỏi kho. Ảnh được lưu thêm ${NGAY_LUU_ANH_LO_HUY} ngày rồi tự xoá. Muốn dùng lại thì nhập đúng các ảnh đó trong lô mới.`, nhanNguyHiem: "Huỷ lô", opener: nut });
      if (!dongY) return;
      try {
        await api(`/api/ve/lo/${encodeURIComponent(l.loId)}/bo`, { method: "POST", body: {} });
        hienOk("Đã huỷ lô.");
        await lamMoi();
      } catch (err) { showError(errorEl, lyDoLoi(err)); }
      return;
    }
    let xem: XemTruocHuy;
    let donGuiLai: string[] = [];
    try {
      xem = await api<XemTruocHuy>(`/api/ve/lo/${encodeURIComponent(l.loId)}/xem-truoc-huy`);
      if (xem.daGuiPhaiGuiLai > 0) { // mã đơn của các vé đã gửi khách (chỉ khi người xem có quyền xem đơn): để câu báo sau huỷ chỉ đúng đơn cần gửi lại
        const tatCaVe: VeTrongLo[] = [];
        for (let t = 1; t <= 40; t++) { // danh sách chia trang 50: đi hết các trang để câu «đơn cần gửi lại» đủ
          const ds = await api<{ ve: VeTrongLo[]; coTrangSau: boolean }>(`/api/ve/lo/${encodeURIComponent(l.loId)}/ve-trong-lo?trang=${t}`).catch(() => ({ ve: [] as VeTrongLo[], coTrangSau: false }));
          tatCaVe.push(...ds.ve);
          if (!ds.coTrangSau) break;
        }
        donGuiLai = [...new Set(tatCaVe.filter((v) => v.tinhTrang === "DA_GUI" && v.maDon).map((v) => v.maDon as string))];
      }
    } catch (err) { showError(errorEl, lyDoLoi(err)); return; }
    const dong = [
      `Lô có ${xem.tongVe} vé. Huỷ lô sẽ huỷ ${xem.huyDuoc} vé; không hoàn tác được.`,
      xem.giuNguyenDaDung > 0 ? `Giữ nguyên ${xem.giuNguyenDaDung} vé đã dùng.` : "",
      xem.giuNguyenHangNgoaiDaMo > 0 ? `Giữ nguyên ${xem.giuNguyenHangNgoaiDaMo} vé hãng ngoài đã mở ảnh.` : "",
      xem.donCapThay > 0 ? `${xem.donCapThay} đơn đang giữ vé của lô sẽ được trả suất; máy tự cấp vé khác từ kho, kho hết vé thì đơn báo thiếu vé.` : "",
      l.nguon === "HANG_NGOAI" ? "Vé hãng ngoài chưa từng giữ cho đơn nào: huỷ nhầm thì nhập lại đúng ảnh vé đó là được. Vé đã từng giữ cho đơn: huỷ xong không nhập lại được." : "Huỷ xong không nhập lại được vé nào của lô.",
      xem.daGuiPhaiGuiLai > 0 ? `${xem.daGuiPhaiGuiLai} vé trong số huỷ đã gửi cho khách${donGuiLai.length > 0 ? ` (đơn ${donGuiLai.slice(0, 10).join(", ")}${donGuiLai.length > 10 ? "…" : ""})` : ""}: khách còn cầm vé cũ, vé đó không dùng được nữa. Văn phòng phải gửi lại vé thay.` : "",
    ].filter(Boolean);
    let r: HuyLoRes | null = null;
    const xong = await hopHuyCoLyDo({
      tieuDe: "Huỷ phần còn lại của lô này?", hauQua: dong, nhanNguyHiem: "Huỷ lô", opener: nut,
      ...(xem.daGuiPhaiGuiLai > 0 ? { xacNhan: { nhan: `Gõ số vé đã gửi khách sẽ bị huỷ (${xem.daGuiPhaiGuiLai}) để xác nhận`, dung: (go: string) => go.trim() === String(xem.daGuiPhaiGuiLai) } } : {}),
      gui: async (lyDo, go) => { r = await api<HuyLoRes>(`/api/ve/lo/${encodeURIComponent(l.loId)}/bo`, { method: "POST", body: { lyDo, ...(xem.daGuiPhaiGuiLai > 0 ? { xacNhanSoVeDaGui: Number(go.trim()) } : {}) } }); },
    });
    if (!xong || !r) return;
    const k: HuyLoRes = r;
    const giu = k.veGiuNguyen.daDung + k.veGiuNguyen.hangNgoaiDaMo;
    hienOk(`Đã huỷ lô: huỷ ${k.veDaHuy} vé${giu > 0 ? `, giữ nguyên ${giu} vé` : ""}. Máy đã xét cấp vé thay cho ${k.donXetCapThay} đơn.${k.conDonChuaCapThay ? " Còn đơn chưa được xét cấp vé thay: mở từng đơn để cấp tay." : ""}`);
    hienGuiLai(k.canGuiLai > 0 ? `${k.canGuiLai} vé đã gửi cho khách bị huỷ${donGuiLai.length > 0 ? ` (đơn ${donGuiLai.slice(0, 10).join(", ")}${donGuiLai.length > 10 ? "…" : ""})` : ""}: khách còn giữ vé cũ và vé đó không dùng được nữa. Nền tảng chưa tự báo người phụ trách đơn, nên văn phòng phải mở từng đơn đó và gửi lại vé thay cho khách.` : null);
    await lamMoi();
  }

  let trangLo = 1;
  let luotLo = 0; // phản hồi của lần tải cũ (đổi bộ lọc nhanh, mạng chậm) không đè danh sách của lần mới
  async function taiCacLo(): Promise<void> {
    const luot = ++luotLo;
    const loc = thanhLoc.giaTri();
    const hoi = new URLSearchParams([["tatCa", "1"], ["trang", String(trangLo)], ...thamSoLo(dieuKienLo(bang, loc))]);
    try {
      const r = await api<{ lo: LoBoDuoc[]; trang: number; coTrangSau: boolean }>(`/api/ve/lo?${hoi.toString()}`);
      if (luot !== luotLo) return;
      if (r.lo.length === 0 && trangLo > 1) { trangLo -= 1; await taiCacLo(); return; } // trang cuối vừa hết lô (huỷ xong): lùi một trang
      if (r.lo.length === 0) { replaceChildren(cacLoEl, dangLoc(loc) ? rongDoLoc("Không có lô nào khớp bộ lọc.") : h("p", { class: "muted" }, "Không có lô nào.")); return; }
      const ttLo = thanhTrang(r.trang, r.coTrangSau, (t) => { trangLo = t; void taiCacLo(); });
      replaceChildren(cacLoEl, dongDangLoc(), h("ul", { class: "pay-list", "data-khoi": "cac-lo" }, ...r.lo.map((l) => {
        const moTa = h("p", { class: "muted" }, `${l.tenDichVu ?? "Dịch vụ không còn trong danh mục"} · ${NHAN_NHOM[l.nhomKhach] ?? l.nhomKhach} · ${NHAN_NGUON[l.nguon] ?? l.nguon} · ${l.trangThai === "PENDING" ? "đang dở" : "đã vào kho"}${l.daCap ? " · đã cấp cho đơn" : ""} · ${l.soVe} vé · tạo ${ngayVn(l.taoLuc)}`);
        const khuVe = h("div", { "data-khoi": "ve-cua-lo", hidden: true });
        const nutXem = h("button", { type: "button", class: "btn", "data-action": "xem-ve-lo", "data-id": l.loId, "aria-expanded": "false" }, "Xem vé");
        nutXem.addEventListener("click", async () => {
          if (!khuVe.hidden) { khuVe.hidden = true; nutXem.setAttribute("aria-expanded", "false"); return; }
          khuVe.hidden = false; nutXem.setAttribute("aria-expanded", "true");
          await veCuaLo(khuVe, l.loId, { huyDuoc: huyVeDuoc(l.nguon), nguon: l.nguon, sauHuy: sauHuyVe });
        });
        const nut: HTMLElement[] = [];
        if (thaoTacLo(l.nguon)) nut.push(nutXem); // máy chủ chỉ trả danh sách vé cho người thao tác được lô
        if (huyLoDuoc(l)) {
          const nutHuy = h("button", { type: "button", class: "btn", "data-action": "bo-lo", "data-id": l.loId }, "Huỷ lô");
          nutHuy.addEventListener("click", async () => { nutHuy.disabled = true; try { await huyLo(l, nutHuy); } finally { nutHuy.disabled = false; } });
          nut.push(nutHuy);
        }
        return h("li", { "data-lo": l.loId, "data-ma": l.catalogCode }, h("strong", null, l.tenSanPham), moTa, h("div", { class: "handler-actions" }, ...nut), khuVe);
      })), ...(ttLo ? [ttLo] : []));
    } catch (err) {
      if (luot !== luotLo) return;
      replaceChildren(cacLoEl, h("p", { class: "alert", role: "alert" }, lyDoLoi(err)));
    }
  }

  function dungForm(dm: Api.CatalogPublicResponse | null, loiDanhMuc: string | null): void {
    // N4: chọn dịch vụ bằng CHÍNH khung của Tạo đơn (ô tìm + hàng nút nhóm + ★ Hay dùng), chế độ «chọn một»; vé không cần giá nên dòng chưa có giá vẫn chọn được; nhớ nhóm bằng khoá riêng của trang này.
    let maDichVu = "";
    const khungDv = createCatalogPicker({ cheDo: "chon-mot", khongYeuCauGia: true, khoaNho: "ve-kho", onPick: (c) => { maDichVu = c.code; }, onDoi: () => { maDichVu = ""; } });
    if (dm) {
      khungDv.setGroups(dm.groups);
      khungDv.setItems(dm.items);
    }
    khungDv.setTaiKhoan(staff.id);
    const chonDv = h("div", { id: "vk-dich-vu", class: "vk-dich-vu", role: "group", "aria-labelledby": "vk-dich-vu-nhan" }, khungDv.root);
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
      h("div", { class: "lb-truong" }, h("span", { class: "nhan", id: "vk-dich-vu-nhan" }, "Dịch vụ"), chonDv), truong("Loại khách", "vk-nhom", chonNhom), truong("Tên sản phẩm in trên vé", "vk-ten-sp", tenSp),
      truong("Dùng từ ngày (chung cho cả lô)", "vk-tu-ngay", tuNgay), truong("Dùng đến ngày (chung cho cả lô)", "vk-den-ngay", denNgay),
      truong(`Ảnh vé (JPG hoặc PNG, mỗi ảnh tối đa 3 MB, mỗi lô tối đa ${tranLo} ảnh)`, "vk-tep", tep),
      h("p", { class: "muted" }, "Máy tự đọc mã QR trên từng ảnh để chống trùng, nhưng không đọc ngày hay loại vé. Mỗi lô chỉ chọn vé cùng một sản phẩm, cùng loại khách và cùng ngày dùng. Chọn «Mọi loại khách» khi vé dùng được cho cả người lớn, trẻ em và người cao tuổi."),
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
      if (maDichVu === "") { baoLoi("Chọn dịch vụ cho lô vé."); return; }
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

        const lo = await api<{ loId: string }>("/api/ve/lo", { method: "POST", body: { catalogCode: maDichVu, nhomKhach: chonNhom.value, tenSanPham: tenSp.value, soVeDuKien: loc.hop.length } });
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
          const xn = await api<{ dichVuKhongVe: boolean; canhBaoNguon?: boolean }>(`/api/ve/lo/${encodeURIComponent(lo.loId)}/xac-nhan`, { method: "POST", body: {} });
          trangThai.hidden = true;
          // ADR-0175 Đ1.5a: dịch vụ đang dùng vé của nguồn khác ⇒ lô chưa được cấp cho ai tới khi Quản trị đổi ô «Vé do ai phát».
          hienOk(xn.dichVuKhongVe ? `Đã nhập ${them} vé vào kho. Dịch vụ này đang tắt ô «Có vé» nên máy chưa giữ vé cho đơn. Hãy báo Quản trị bật ô này ở màn Dịch vụ & giá.`
            : xn.canhBaoNguon ? `Đã nhập ${them} vé vào kho. Lô chưa được cấp cho ai tới khi Quản trị đổi ô «Vé do ai phát» ở màn Dịch vụ & giá.` : `Đã nhập ${them} vé vào kho.`);
          form.reset();
          khungDv.xoaChon();
          maDichVu = "";
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

  // Bước 1 khung chung (N10): khối «Nhập lô mới» (danh mục dài) dựng sau khi tải — giữ chỗ trước để các khối dưới không bị đẩy.
  if (nhapLo) replaceChildren(loEl, trangThaiHeThong("dang-tai", { khuon: "bieu-mau", giuCho: true }));
  replaceChildren(timEl, khoiTimVe((nguon) => huyVeDuoc(nguon as Nguon), sauHuyVe));
  const sauDanhMuc = danhMucHua.then(({ r, loi }) => {
    danhMuc = r;
    bang = bangNhomTheoMa(r?.items ?? []);
    if (loi) { loiDanhMucEl.textContent = `Chưa tải được nhóm dịch vụ nên chỉ lọc bằng ô tìm. ${loi}`; loiDanhMucEl.hidden = false; }
    capNhatHangNhom();
    return { r, loi };
  });
  await taiKho();
  await Promise.all([taiCacLo(), taiLoDaHuy(),
    sauDanhMuc.then(async ({ r, loi }) => {
      if (nhapLo) dungForm(r, loi);
      if (taoVe) await dungKhoiTaoVe(taoEl, { danhMuc: r, loiDanhMuc: loi, staffId: staff.id, tranLo: () => tranLo, hienOk, sauKhiTao: async () => { await Promise.all([taiKho(), taiCacLo(), taiLoDaHuy()]); } });
    })]);
}
