// Điều kiện xuất bến (/dieu-kien-xuat-ben — ADR-0049 D2; ADR-0050 VK1-C). Chỉ Toàn quyền (ô settings.ops — máy chủ hỏi lại). Bản vẽ KHÔNG vẽ trang này: khuôn
// sẵn của trang danh mục ([MH] "Dùng khuôn sẵn"), lối vào là liên kết "Điều kiện theo cỡ xe, hạng bằng ›" ở trang Chính sách điều phối (bản vẽ 8a).
// Hai khối: (1) điều kiện theo cỡ xe — thêm, đóng một lần (không sửa, không mở lại); Kiểm định + Bảo hiểm gieo sẵn cho mọi xe; (2) số khách tối đa theo hạng bằng
// (không kể tài xế) — đổi = một dòng mới. Không lộ mã loại / mã hạng: tên từ danh mục (GET /api/van-chuyen/meta, /api/parties/documents/meta).
// Khuôn Thiết lập của khung gốc (ADR-0222, đợt D3; mẫu Địa điểm): mỗi danh mục một khối, nút «Thêm điều kiện» ở đầu khối, «Ngừng điều kiện» / «Đổi» cuối dòng;
// biểu mẫu thêm và biểu mẫu đổi số khách mở trong bảng trượt, lỗi của thao tác hiện ngay trong bảng. Không có ô settings.ops: trạng thái không quyền chung, nút về
// trang cha. Lối về trang Chính sách điều phối là nút quay lại của khung chung (data-back của <body>), không còn liên kết riêng ở đầu trang.
import { docDieuKienMoi, docSoKhachHang, nhanDieuKien, nhanSoKhachHang } from "../src/shared/chinh-sach-hien-thi";
import { ngayVN } from "../src/shared/giay-to-hien-thi";
import { can } from "../src/shared/permissions";
import { msToVnLocal } from "../src/shared/vn-date";
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan, moBangTruot, type BangTruot } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { datCrumb, loiCua } from "./giay-to-ui";
import { dsDong, luoi, truong } from "./khung";
import { initShell, showError } from "./shell";
import { trangThaiToanTrang } from "./trang-thai-he-thong";

const errorEl = byId("error");
const okEl = byId("dk-ok");
const dkEl = byId("dk-dieu-kien");
const hbEl = byId("dk-hang-bang");

const staff = await initShell();
datCrumb("Vận chuyển › Chính sách điều phối", "Điều kiện cho xe chạy");

let rules: Api.DepartureRuleDto[] = [];
let capacity: Api.LicenseCapacityResponse = { current: [], history: [] };
let loaiXe: Api.DocumentTypeDto[] = [];
let loaiNguoi: Api.DocumentTypeDto[] = [];
let hang: Api.LicenseClassDto[] = [];
let dangGui = false;
/** Nơi hiện lỗi: dải lỗi của trang, hoặc dải lỗi của bảng trượt đang mở (dải của trang nằm sau bảng, không ai thấy) — như màn Địa điểm. */
let noiLoi: HTMLElement = errorEl;

const ngayTuIso = (iso: string): string => ngayVN(msToVnLocal(Date.parse(iso)).date);

async function nap(): Promise<void> {
  const [r, c, mx, mn] = await Promise.all([
    api<Api.DepartureRuleListResponse>("/api/van-chuyen/dieu-kien"),
    api<Api.LicenseCapacityResponse>("/api/van-chuyen/hang-bang"),
    api<Api.VanChuyenMetaResponse>("/api/van-chuyen/meta"),
    api<Api.PersonDocumentMetaResponse>("/api/parties/documents/meta"),
  ]);
  rules = r.rules;
  capacity = c;
  loaiXe = mx.documentTypes;
  loaiNguoi = mn.types;
  hang = mn.classes;
}

function bao(ok: string | null, loi: string | null): void {
  showError(okEl, ok);
  if (noiLoi !== errorEl) showError(errorEl, null);
  showError(noiLoi, loi);
  (loi ? noiLoi : ok ? okEl : null)?.scrollIntoView({ block: "nearest" });
}
/** Chạy một lệnh ghi. `bang`: bảng trượt đang mở — thành công thì đóng bảng rồi báo ở trang; máy chủ từ chối thì báo trong bảng; bản đã cũ thì đóng bảng, nạp lại, báo ở trang. */
async function ghi(fn: () => Promise<string>, bang?: BangTruot): Promise<void> {
  if (dangGui) return;
  dangGui = true;
  bao(null, null);
  bang?.setBusy(true);
  try {
    const cau = await fn();
    bang?.setBusy(false);
    bang?.close(false); // danh sách sắp được vẽ lại: nút đã mở bảng không còn
    ve();
    bao(cau, null);
  } catch (err) {
    bang?.setBusy(false);
    if (err instanceof ApiError && (err.code === "stale" || err.code === "rule_closed")) {
      bang?.close(false);
      await nap().catch(() => undefined);
      ve();
    }
    bao(null, loiCua(err));
  } finally {
    dangGui = false;
  }
}

/** Mở bảng trượt chứa một biểu mẫu (dải lỗi riêng ở đầu bảng; chân bảng có «Đóng» và nút ghi). Enter trong ô và bấm nút ghi cùng gọi `gui`. */
let demBang = 0;
function moBieuMau(o: { tieuDe: string; than: HTMLElement[]; nutGhi: HTMLButtonElement; opener: HTMLElement; gui: (bang: BangTruot) => void }): void {
  const id = `dk-bieu-mau-${++demBang}`;
  const loi = h("div", { class: "alert", role: "alert", hidden: true });
  const bieuMau = h("form", { id, class: "luoi", autocomplete: "off", novalidate: true }, ...o.than);
  const dong = h("button", { type: "button", class: "nut", "data-co": "lon" }, "Đóng");
  o.nutGhi.setAttribute("form", id); // nút ghi đứng ở chân bảng, ngoài <form>
  const bang = moBangTruot({ title: o.tieuDe, body: [loi, bieuMau], foot: [dong, o.nutGhi], footClass: "vc-foot-2", opener: o.opener, onClosed: () => (noiLoi = errorEl) });
  if (!bang) return;
  noiLoi = loi;
  dong.addEventListener("click", () => bang.close());
  bieuMau.addEventListener("submit", (e) => {
    e.preventDefault();
    o.gui(bang);
  });
}

const tenNguoi = (code: string): string | undefined => loaiNguoi.find((t) => t.code === code)?.name;

// ---- khối 1: điều kiện theo cỡ xe ---------------------------------------------------------------------------------------------------------------------------
function moThemDieuKien(opener: HTMLElement): void {
  const coXe = h("input", { id: "dk-co-xe", class: "o", type: "text", inputmode: "numeric", value: "1", autocomplete: "off", "aria-describedby": "dk-co-xe-hint" });
  const doiTuong = h("select", { id: "dk-doi-tuong", class: "o" }, h("option", { value: "VEHICLE" }, "Giấy tờ của xe"), h("option", { value: "DRIVER" }, "Giấy tờ của tài xế"));
  const loai = h("select", { id: "dk-loai", class: "o" });
  const napLoai = (): void => {
    const ds = (doiTuong.value === "DRIVER" ? loaiNguoi : loaiXe).filter((t) => t.active);
    replaceChildren(loai, h("option", { value: "" }, "Chọn loại giấy tờ"), ...ds.map((t) => h("option", { value: t.code }, t.name)));
  };
  doiTuong.addEventListener("change", napLoai);
  napLoai();
  const them = h("button", { type: "submit", class: "nut", "data-co": "lon", "data-cap": "chinh", "data-action": "them-dieu-kien" }, "Thêm điều kiện");
  moBieuMau({
    tieuDe: "Thêm điều kiện",
    than: [
      truong("Áp cho xe chở từ (người)", coXe, { goiY: h("span", { id: "dk-co-xe-hint" }, "1 = mọi xe.") }),
      truong("Giấy tờ của", doiTuong),
      truong("Loại giấy tờ", loai),
    ],
    nutGhi: them,
    opener,
    gui: (bang) => {
      const r = docDieuKienMoi({ coXe: coXe.value, doiTuong: doiTuong.value as "VEHICLE" | "DRIVER", loai: loai.value });
      if (!r.ok) return bao(null, r.loi);
      void ghi(async () => {
        rules = (await api<Api.DepartureRuleListResponse>("/api/van-chuyen/dieu-kien", { method: "POST", body: r.value })).rules;
        return "Đã thêm điều kiện cho xe chạy — áp ngay từ bây giờ.";
      }, bang);
    },
  });
}

function veDieuKien(): void {
  const dangAp = rules.filter((r) => r.active);
  const daDong = rules.filter((r) => !r.active);
  const dong = (r: Api.DepartureRuleDto): HTMLElement => {
    const nhan = nhanDieuKien(r, tenNguoi);
    const nut = r.active
      ? h("button", { type: "button", class: "nut", "data-cap": "nguy-hiem", "data-action": "dong-dieu-kien", "aria-label": `Ngừng điều kiện ${nhan}` }, "Ngừng điều kiện")
      : null;
    nut?.addEventListener("click", async () => {
      if (!(await hoiXacNhan({ tieuDe: `Ngừng điều kiện “${nhan}”`, hauQua: "Từ lúc này xe không còn phải có giấy này mới được chạy. Không mở lại được — muốn áp lại thì thêm điều kiện mới.", nhanNguyHiem: "Ngừng điều kiện", opener: nut }))) return;
      void ghi(async () => {
        rules = (await api<Api.DepartureRuleListResponse>(`/api/van-chuyen/dieu-kien/${encodeURIComponent(r.id)}/dong`, { method: "POST" })).rules;
        return `Đã ngừng điều kiện “${nhan}”.`;
      });
    });
    return h(
      "div",
      { class: "dong", "data-rule": r.id, "data-ngung": r.active ? undefined : "" },
      h(
        "div",
        { class: "dong-chu" },
        h("strong", null, nhan),
        h("span", { class: "o-phu" }, r.active ? `Áp từ ${ngayTuIso(r.validFrom)}` : `Đã ngừng ${ngayTuIso(r.validTo ?? r.validFrom)}`),
      ),
      r.active ? h("span", { class: "huy-hieu", "data-tong": "la" }, "Đang áp dụng") : h("span", { class: "huy-hieu", "data-tong": "xam" }, "Đã ngừng"),
      nut,
    );
  };
  const moThem = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "mo-them-dieu-kien" }, "+ Thêm điều kiện");
  moThem.addEventListener("click", () => moThemDieuKien(moThem));
  replaceChildren(
    dkEl,
    h("header", { class: "khoi-dau" }, h("h2", { id: "dk-dieu-kien-title" }, "Điều kiện theo cỡ xe")),
    h("div", { class: "khoi-viec", "data-cho": "dau" }, moThem),
    dsDong(null, ...(dangAp.length ? dangAp.map(dong) : [h("div", { class: "dong o-phu" }, "Chưa có điều kiện nào đang áp.")]), ...daDong.map(dong)),
  );
  dkEl.hidden = false;
}

// ---- khối 2: số khách theo hạng bằng ------------------------------------------------------------------------------------------------------------------------
function moDoiHang(x: Api.LicenseClassDto, c: Api.LicenseCapacityDto | undefined, opener: HTMLElement): void {
  const o = h("input", { id: "dk-hang-o", class: "o", type: "text", inputmode: "numeric", value: c?.maxPassengers == null ? "" : String(c.maxPassengers), autocomplete: "off", "aria-describedby": "dk-hang-o-hint" });
  const luu = h("button", { type: "submit", class: "nut", "data-co": "lon", "data-cap": "chinh", "data-action": "luu-hang" }, "Lưu");
  moBieuMau({
    tieuDe: `Đổi số khách hạng ${x.name}`,
    than: [truong(`Số khách tối đa — hạng ${x.name}`, o, { goiY: h("span", { id: "dk-hang-o-hint" }, "Không kể tài xế. Để trống = không giới hạn.") })],
    nutGhi: luu,
    opener,
    gui: (bang) => {
      const r = docSoKhachHang(x.code, o.value);
      if (!r.ok) return bao(null, r.loi);
      void ghi(async () => {
        capacity = await api<Api.LicenseCapacityResponse>("/api/van-chuyen/hang-bang", { method: "POST", body: r.value });
        return `Đã lưu hạng ${x.name}: ${nhanSoKhachHang(r.value.maxPassengers).toLocaleLowerCase("vi-VN")}.`;
      }, bang);
    },
  });
  o.focus();
}

function veHangBang(): void {
  const hienHanh = new Map(capacity.current.map((c) => [c.classCode, c]));
  const dsHang = [...hang.filter((x) => x.active || hienHanh.has(x.code))];
  const dong = (x: Api.LicenseClassDto): HTMLElement => {
    const c = hienHanh.get(x.code);
    const doi = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "doi-hang", "aria-label": `Đổi số khách hạng ${x.name}` }, "Đổi");
    doi.addEventListener("click", () => {
      bao(null, null);
      moDoiHang(x, c, doi);
    });
    return h(
      "div",
      { class: "dong", "data-hang": x.code },
      h(
        "div",
        { class: "dong-chu" },
        h("strong", null, x.name),
        h("span", { class: "o-phu" }, c ? `${nhanSoKhachHang(c.maxPassengers)} · áp từ ${ngayTuIso(c.validFrom)}` : nhanSoKhachHang(undefined)),
      ),
      doi,
    );
  };
  replaceChildren(hbEl, h("header", { class: "khoi-dau" }, h("h2", { id: "dk-hang-bang-title" }, "Số khách theo hạng bằng")), dsDong(null, ...dsHang.map(dong)));
  hbEl.hidden = false;
}

function ve(): void {
  veDieuKien();
  veHangBang();
}

async function main(): Promise<void> {
  if (!can(staff, "settings.ops")) {
    trangThaiToanTrang("403", { cau: "Chỉ Toàn quyền xem và đổi được điều kiện cho xe chạy.", trangCha: { nhan: "Chính sách điều phối", href: "/chinh-sach-dieu-phoi" } });
    return;
  }
  try {
    await nap();
  } catch (err) {
    return showError(errorEl, loiCua(err));
  }
  ve();
}
await main();
