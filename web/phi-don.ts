// Màn «Phí đưa đón» (kế hoạch Phí đưa đón, Đợt B Task 8; chỉ ô admin.manage): trạng thái áp, Thử tra, bảng mức, thêm / đổi / kết thúc mức, đặt ngày bắt đầu áp.
// Gọi: GET /api/pricing/phi-don, POST /api/pricing/phi-don (kèm thayCho khi «Đổi mức»), POST …/:id/ket-thuc, POST …/bat-dau-ap, GET …/thu-tra. Máy chủ hỏi lại mọi cổng.
// Giao diện KHÔNG tự tính tiền: số trong «Thử tra» do máy chủ trả. Chữ hiển thị ở src/shared/phi-don-hien-thi.ts (thuần, có bài kiểm).
import { moTrang } from "../src/shared/muc-giao-dien";
import {
  cauCanhBaoGop, cauDieuKien, cauKetQuaThuTra, cauKhoangNgay, cauTien, dieuKienGui, soTienDocDuoc, type TenPhiDon,
} from "../src/shared/phi-don-hien-thi";
import { addDays, ngayDayDu, vnToday } from "../src/shared/vn-date";
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";
import { hienBaoNgan } from "./toast";

const errorEl = byId("error");
const khungEl = byId("pd-khung");
const trangThaiEl = byId("pd-trang-thai");
const thuTraEl = byId("pd-thu-tra");
const canhBaoEl = byId("pd-canh-bao");
const thieuChungEl = byId("pd-thieu-chung");
const themEl = byId<HTMLButtonElement>("pd-them");
const formEl = byId("pd-form");
const mucEl = byId("pd-muc");

let du: Api.PhiDonResponse | null = null;
let canhBaoSauLuu: Api.CanhBaoPhiDonDto[] = [];
let ketQuaThuTra: string[] | null = null;
const homNay = (): string => vnToday(new Date());

const STALE = "Mức phí vừa được người khác thay đổi nên bản đang xem đã cũ. Đã nạp bản mới, hãy kiểm tra rồi làm lại nếu vẫn cần.";

/** Mọi lỗi của màn đi qua đây; đưa câu lỗi vào tầm nhìn. */
function hienLoi(cau: string): void {
  showError(errorEl, cau);
  errorEl.scrollIntoView({ block: "nearest" });
}
const loiCua = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

function ten(): TenPhiDon {
  const d = du!;
  return {
    vung: new Map(d.vung.map((x) => [x.code, x.name])),
    cap: new Map(d.cap.map((x) => [x.code, x.name])),
    nhom: new Map(d.nhom.map((x) => [x.code, x.name])),
    dichVu: new Map(d.dichVu.map((x) => [x.code, x.name])),
    muc: new Map(d.muc.map((m) => [m.id, m])),
  };
}

async function nap(): Promise<boolean> {
  try {
    du = await api<Api.PhiDonResponse>("/api/pricing/phi-don");
    canhBaoSauLuu = []; // cảnh báo riêng chỉ sống tới lần nạp kế tiếp (lưu mức đặt lại ngay sau nap)
    showError(errorEl, null);
    return true;
  } catch (err) {
    hienLoi(loiCua(err));
    return false;
  }
}

/** Chạy một lệnh ghi: khoá nút tới khi xong; 409 `stale` thì nạp lại rồi báo. Trả true khi ghi được. */
async function ghi(nut: HTMLButtonElement, fn: () => Promise<void>): Promise<boolean> {
  if (nut.disabled) return false;
  showError(errorEl, null);
  nut.disabled = true;
  try {
    await fn();
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.code === "stale") {
      await nap();
      dongForm(); // form cũ giữ updatedAt đã cũ: đóng để lần làm lại đọc bản mới
      ve();
      hienLoi(STALE);
    } else hienLoi(loiCua(err));
    return false;
  } finally {
    nut.disabled = false;
  }
}

const o = (nhan: string, ...ruot: (HTMLElement | string)[]): HTMLElement => h("label", { class: "pd-o" }, h("span", { class: "muted" }, nhan), ...ruot);
const chon = (tuyChon: [string, string][], dau?: string): HTMLSelectElement =>
  h("select", null, ...(dau === undefined ? [] : [h("option", { value: "" }, dau)]), ...tuyChon.map(([v, t]) => h("option", { value: v }, t)));
const nutPhu = (nhan: string, khiBam: () => void): HTMLButtonElement => {
  const n = h("button", { type: "button", class: "pill-btn" }, nhan);
  n.addEventListener("click", khiBam);
  return n;
};

// ---------- Khối 1: trạng thái ----------
function veTrangThai(): void {
  const d = du!;
  const ngay = d.batDauAp.ngay;
  const dong = ngay === null ? "Chưa áp phí đưa đón" : ngay > homNay() ? `Phí đưa đón sẽ áp từ ${ngayDayDu(ngay)}` : `Phí đưa đón đang áp từ ${ngayDayDu(ngay)}`;
  const nutDat = nutPhu("Đặt ngày bắt đầu áp", () => moForm({ loai: "ngayAp" }));
  const nutTat = ngay === null ? null : nutPhu("Tắt phí đưa đón", () => void tat(nutTat!));
  replaceChildren(trangThaiEl, h("strong", null, dong), h("div", { class: "actions" }, nutDat, nutTat));
}

async function tat(nutBam: HTMLButtonElement): Promise<void> {
  const dongY = await hoiXacNhan({
    tieuDe: "Tắt phí đưa đón?",
    hauQua: "Từ lúc tắt, đơn chưa xác nhận không còn ô «Phí đưa đón» và không tính phí đón. Đơn đã xác nhận giữ phí đã chọn. Bật lại bằng «Đặt ngày bắt đầu áp».",
    nhanNguyHiem: "Tắt phí đưa đón",
    opener: nutBam,
  });
  if (!dongY) return;
  const ok = await ghi(nutBam, async () => {
    await api<Api.PhiDonBatDauApResponse>("/api/pricing/phi-don/bat-dau-ap", { method: "POST", body: { ngay: null, tuLucDaDoc: du!.batDauAp.tuLuc } });
    await nap();
    ve();
  });
  if (ok) hienBaoNgan("Đã tắt phí đưa đón.");
}

// ---------- Khối 2: thử tra ----------
function veThuTra(): void {
  ketQuaThuTra = null; // khối dựng lại thì các ô về mặc định: không để kết quả cũ nằm cạnh ô trống
  const d = du!;
  const vung = chon(d.vung.map((x) => [x.code, x.name]));
  const dv = chon(d.dichVu.map((x) => [x.code, x.name]));
  const cap = chon(d.cap.map((x) => [x.code, x.name]), "Khách lẻ / chưa có cấp");
  const chieu = chon([["OUT", "Chiều đi"], ["RETURN", "Chiều về"]]);
  const xe = chon([["0", "Đi chung"], ["1", "Xe riêng"]]);
  const soKhach = h("input", { type: "text", inputMode: "numeric", autocomplete: "off", value: "2" });
  const ngay = h("input", { type: "date", value: homNay() });
  const nut = h("button", { type: "button", class: "btn btn-primary" }, "Thử tra");
  const kq = h("div", { class: "pd-kq", role: "status" });
  const veKq = (): void => replaceChildren(kq, ...(ketQuaThuTra ?? []).map((c, i) => h("div", { class: i === 0 ? "pd-kq-chinh" : "muted" }, c)));
  veKq();
  nut.addEventListener("click", async () => {
    const n = soTienDocDuoc(soKhach.value);
    if (n === null || n < 1) return hienLoi("Số khách phải là số nguyên từ 1 trở lên.");
    const q = new URLSearchParams({ vung: vung.value, dichVu: dv.value, cap: cap.value, chieu: chieu.value, xeRieng: xe.value, soKhach: String(n), ngay: ngay.value });
    await ghi(nut, async () => {
      const r = await api<Api.ThuTraPhiDonResponse>(`/api/pricing/phi-don/thu-tra?${q.toString()}`);
      ketQuaThuTra = cauKetQuaThuTra(r, ten());
      veKq();
    });
  });
  replaceChildren(
    thuTraEl,
    h("strong", null, "Thử tra"),
    h("div", { class: "grid three" }, o("Khu vực đón", vung), o("Dịch vụ", dv), o("Cấp độ đại lý", cap), o("Chiều", chieu), o("Đi chung hay xe riêng", xe), o("Số khách", soKhach), o("Ngày", ngay)),
    h("div", { class: "actions" }, nut),
    kq,
  );
}

// ---------- Khối 3: bảng mức ----------
/**
 * Băng báo «chưa có mức chung» của Đợt B: TẮT từ ADR-0214 (Task 6) — phí trên đơn do văn phòng chọn, bảng mức không còn chặn xác nhận đơn nên câu «đơn … không xác nhận được» đã sai. Máy chủ vẫn trả
 * `vungThieuMucChung` (ruling P3 của Task 3 để giao diện quyết); giữ phần tử để dễ bật lại nếu chủ muốn dùng bảng cho việc khác.
 */
function veThieuChung(): void {
  thieuChungEl.hidden = true;
  replaceChildren(thieuChungEl);
}

function veCanhBao(): void {
  const dong = cauCanhBaoGop([...du!.canhBao, ...canhBaoSauLuu], ten());
  canhBaoEl.hidden = dong.length === 0;
  replaceChildren(canhBaoEl, h("strong", null, "Cấp đang trả cao hơn bên không có cấp (chỉ nhắc, không chặn):"), ...dong.map((c) => h("div", null, c)));
}

function hanhDong(m: Api.MucPhiDonDto): HTMLElement[] {
  if (m.denNgay !== null) return [];
  return [nutPhu("Đổi mức phí", () => moForm({ loai: "doi", m })), nutPhu("Kết thúc mức", () => moForm({ loai: "ketThuc", m }))];
}

function veMuc(): void {
  const d = du!;
  const t = ten();
  const maVung = [...d.vung.map((x) => x.code), ...new Set(d.muc.map((m) => m.dieuKien.vung).filter((v) => !t.vung.has(v)))];
  const nhom = maVung.map((v) => ({ v, ds: d.muc.filter((m) => m.dieuKien.vung === v) })).filter((x) => x.ds.length > 0 || t.vung.has(x.v));
  const khoi = nhom.map(({ v, ds }) => {
    const ten1 = t.vung.get(v) ?? `${v} (đã ngưng)`;
    if (ds.length === 0) return h("div", { class: "pd-vung" }, h("h3", null, ten1), h("p", { class: "muted" }, "Chưa có mức nào cho khu vực này."));
    const hang = (m: Api.MucPhiDonDto) =>
      h("tr", null, h("td", null, cauDieuKien(m, t)), h("td", null, cauTien(m)), h("td", null, cauKhoangNgay(m.tuNgay, m.denNgay)), h("td", { class: "muted" }, m.ghiChu ?? ""), h("td", { class: "row-actions" }, ...hanhDong(m)));
    const the = (m: Api.MucPhiDonDto) => {
      const nutM = hanhDong(m);
      return h("div", { class: "card card-col" }, h("div", null, h("strong", null, cauTien(m))), h("div", null, cauDieuKien(m, t)), h("div", { class: "muted" }, cauKhoangNgay(m.tuNgay, m.denNgay)),
        m.ghiChu && h("div", { class: "muted" }, m.ghiChu), nutM.length > 0 && h("div", { class: "actions" }, ...nutM));
    };
    return h("div", { class: "pd-vung" }, h("h3", null, ten1),
      h("section", { class: "card table-wrap" }, h("table", { class: "items" }, h("thead", null, h("tr", null, h("th", null, "Điều kiện"), h("th", null, "Số tiền"), h("th", null, "Hiệu lực"), h("th", null, "Ghi chú"), h("th", null))), h("tbody", null, ...ds.map(hang)))),
      h("div", { class: "card-list" }, ...ds.map(the)));
  });
  replaceChildren(mucEl, ...khoi);
}

// ---------- Khung nhập (thêm, đổi, kết thúc, ngày bắt đầu áp) ----------
type Che = { loai: "them" } | { loai: "doi"; m: Api.MucPhiDonDto } | { loai: "ketThuc"; m: Api.MucPhiDonDto } | { loai: "ngayAp" };

function dongForm(): void {
  replaceChildren(formEl);
}

function khungNhap(tieuDe: string, ...ruot: (HTMLElement | false | null)[]): HTMLElement {
  return h("div", { class: "card card-col pd-form", "data-testid": "pd-form-khung" }, h("strong", null, tieuDe), ...ruot);
}

function moForm(che: Che): void {
  showError(errorEl, null);
  const d = du!;
  const nhanLuu = che.loai === "ngayAp" ? "Lưu ngày bắt đầu áp" : che.loai === "ketThuc" ? "Lưu ngày kết thúc" : "Lưu mức phí";
  const luu = h("button", { type: "button", class: "btn btn-primary btn-chinh" }, nhanLuu);
  const dong = h("button", { type: "button", class: "btn" }, "Đóng");
  dong.addEventListener("click", dongForm);
  const nutHang = h("div", { class: "actions" }, luu, dong);
  let khung: HTMLElement;

  if (che.loai === "ngayAp") {
    const ngay = h("input", { type: "date", value: d.batDauAp.ngay ?? homNay() });
    luu.addEventListener("click", async () => {
      if (!ngay.value) return hienLoi("Chọn ngày bắt đầu áp.");
      const ok = await ghi(luu, async () => {
        await api<Api.PhiDonBatDauApResponse>("/api/pricing/phi-don/bat-dau-ap", { method: "POST", body: { ngay: ngay.value, tuLucDaDoc: du!.batDauAp.tuLuc } });
        await nap();
        dongForm();
        ve();
      });
      if (ok) hienBaoNgan("Đã đặt ngày bắt đầu áp phí đưa đón.");
    });
    khung = khungNhap("Đặt ngày bắt đầu áp", h("p", { class: "muted" }, "Từ ngày này, mỗi lượt đón trên đơn có ô «Phí đưa đón» để văn phòng chọn; lượt chưa chọn phí thì đơn không xác nhận được. Không cần nhập bảng mức trước."), o("Ngày bắt đầu áp", ngay), nutHang);
  } else if (che.loai === "ketThuc") {
    const m = che.m;
    // Mức chưa bắt đầu mà để «hôm nay» thì máy chủ luôn từ chối (ngày kết thúc trước ngày bắt đầu): mặc định lấy ngày lớn hơn.
    const ngay = h("input", { type: "date", value: homNay() < m.tuNgay ? m.tuNgay : homNay() });
    luu.addEventListener("click", async () => {
      if (!ngay.value) return hienLoi("Chọn ngày kết thúc.");
      const ok = await ghi(luu, async () => {
        await api<{ muc: Api.MucPhiDonDto }>(`/api/pricing/phi-don/${m.id}/ket-thuc`, { method: "POST", body: { validTo: ngay.value, expectedUpdatedAt: m.updatedAt } });
        await nap();
        dongForm();
        ve();
      });
      if (ok) hienBaoNgan("Đã kết thúc mức.");
    });
    khung = khungNhap("Kết thúc mức", h("p", null, cauDieuKien(m, ten()), " · ", cauTien(m)), o("Ngày kết thúc (còn áp dụng đến hết ngày này)", ngay), nutHang);
  } else {
    const doi = che.loai === "doi" ? che.m : null;
    const vung = chon(d.vung.map((x) => [x.code, x.name]), "Chọn khu vực");
    const kieu = chon([["PER_PAX", "Đi chung (tính theo khách)"], ["PER_TRIP", "Xe riêng (tính theo chuyến)"]]);
    const cap = chon(d.cap.map((x) => [x.code, x.name]), "Mọi cấp");
    const dv = chon(d.dichVu.map((x) => [x.code, x.name]), "Không nêu dịch vụ");
    const nhom = chon(d.nhom.map((x) => [x.code, x.name]), "Không nêu nhóm");
    const chieu = chon([["OUT", "Chiều đi"], ["RETURN", "Chiều về"]], "Cả hai chiều");
    const tien = h("input", { type: "text", inputMode: "numeric", autocomplete: "off", placeholder: "0 = miễn phí" });
    const nhanTien = h("span", { class: "muted" }, "");
    const tuNgay = h("input", { type: "date", value: doi ? addDays(homNay(), 1) : homNay() });
    const denNgay = h("input", { type: "date", value: "" });
    const ghiChu = h("input", { type: "text", maxLength: 200, autocomplete: "off" });
    const capNhatKieu = (): void => { nhanTien.textContent = kieu.value === "PER_TRIP" ? "Số tiền mỗi chuyến (đồng)" : "Số tiền mỗi khách (đồng)"; };
    kieu.addEventListener("change", capNhatKieu);
    // Dịch vụ HOẶC nhóm: chọn cái này thì khoá cái kia.
    const khoaCheo = (): void => { nhom.disabled = dv.value !== ""; dv.disabled = nhom.value !== ""; };
    dv.addEventListener("change", () => { if (dv.value !== "") nhom.value = ""; khoaCheo(); });
    nhom.addEventListener("change", () => { if (nhom.value !== "") dv.value = ""; khoaCheo(); });
    if (doi) {
      const dk = doi.dieuKien;
      vung.value = dk.vung; kieu.value = doi.kieu; cap.value = dk.cap ?? ""; dv.value = dk.dichVu ?? ""; nhom.value = dk.nhom ?? ""; chieu.value = dk.chieu ?? "";
      for (const x of [vung, kieu, cap, dv, nhom, chieu]) x.disabled = true; // đổi mức giữ nguyên kiểu tính và bộ điều kiện
    }
    capNhatKieu();
    luu.addEventListener("click", async () => {
      if (vung.value === "") return hienLoi("Chọn khu vực đón.");
      const soTien = soTienDocDuoc(tien.value);
      if (soTien === null) return hienLoi("Số tiền phải là số nguyên đồng, từ 0 trở lên.");
      if (!tuNgay.value) return hienLoi("Chọn ngày bắt đầu.");
      const body: Api.PhiDonThemBody = doi
        ? { kind: doi.kieu, amount: soTien, validFrom: tuNgay.value, validTo: denNgay.value || null, note: ghiChu.value.trim() || null, dieuKien: dieuKienGui(doi.dieuKien), thayCho: { id: doi.id, expectedUpdatedAt: doi.updatedAt } }
        : {
            kind: kieu.value as "PER_PAX" | "PER_TRIP", amount: soTien, validFrom: tuNgay.value, validTo: denNgay.value || null, note: ghiChu.value.trim() || null,
            dieuKien: [
              { khoa: "ZONE", giaTri: vung.value },
              ...(cap.value ? [{ khoa: "TIER", giaTri: cap.value }] : []),
              ...(dv.value ? [{ khoa: "SERVICE", giaTri: dv.value }] : []),
              ...(nhom.value ? [{ khoa: "SERVICE_GROUP", giaTri: nhom.value }] : []),
              ...(chieu.value ? [{ khoa: "DIRECTION", giaTri: chieu.value }] : []),
              ...(kieu.value === "PER_TRIP" ? [{ khoa: "EXCLUSIVE", giaTri: "1" }] : []),
            ],
          };
      const ok = await ghi(luu, async () => {
        const r = await api<Api.PhiDonGhiResponse>("/api/pricing/phi-don", { method: "POST", body });
        await nap();
        canhBaoSauLuu = r.canhBao; // đặt SAU nap: nap xoá cảnh báo cũ
        dongForm();
        ve();
      });
      if (ok) hienBaoNgan(doi ? "Đã đổi mức." : "Đã thêm mức.");
    });
    khung = khungNhap(
      doi ? "Đổi mức" : "Thêm mức",
      doi && h("p", { class: "muted" }, `Mức hiện tại: ${cauDieuKien(doi, ten())} · ${cauTien(doi)}. Mức cũ tự kết thúc vào ngày liền trước ngày bắt đầu của mức mới. Chỉ nhập số tiền mới và ngày bắt đầu.`),
      h("div", { class: "grid three" },
        o("Khu vực đón", vung), o("Đi chung hay xe riêng", kieu), o("Cấp độ đại lý", cap), o("Dịch vụ", dv), o("Nhóm dịch vụ", nhom), o("Chiều", chieu),
        h("label", { class: "pd-o" }, nhanTien, tien), o("Từ ngày", tuNgay), o("Đến ngày (để trống nếu chưa có hạn)", denNgay), o("Ghi chú", ghiChu)),
      nutHang,
    );
  }
  replaceChildren(formEl, khung);
  khung.scrollIntoView({ block: "nearest" });
}

function ve(): void {
  veTrangThai();
  veThuTra();
  veCanhBao();
  veThieuChung();
  veMuc();
}

const staff = await initShell();
if (!moTrang("phiDon", staff)) hienLoi("Chỉ quản trị viên được vào trang này.");
else {
  themEl.addEventListener("click", () => moForm({ loai: "them" }));
  if (await nap()) {
    khungEl.hidden = false;
    ve();
  }
}
