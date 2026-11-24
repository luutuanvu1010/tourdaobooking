// Chi tiết xe + giấy tờ xe (/xe-chi-tiet?id=<xe> — ADR-0040 D1; bản vẽ docs/design/van-chuyen-1a/project/03 Chi tiet xe.dc.html).
// Giấy tờ xếp đã hết hạn → sắp hết hạn → còn hạn → không hạn (quyết định thiết kế 3); "Lịch sử (N)" mở ngay dưới dòng (dòng cũ + "Đã thay"); "Gia hạn" =
// dòng mới, "Sửa sai" = lý do bắt buộc (danh sách đóng của máy chủ, chỉ lý do dùng cho xe). Xe đã ngừng: không thêm, không gia hạn (máy chủ trả 409
// vehicle_retired) — vẫn sửa sai được. Số giấy tờ XE hiện đủ (không phải dữ liệu cá nhân — giả định G4 của kế hoạch). GET /api/van-chuyen/xe/:id +
// /api/van-chuyen/meta (loại giấy tờ, mốc nhắc).
// Bố cục: khuôn Chi tiết của khung gốc giao diện (ADR-0222) bằng hàm của web/khung.ts, xếp dọc một cột (không hai cột: khối giấy tờ cần kín bề ngang để
// từ 800 hiện bảng — người điều phối quyết 24/11). Thứ tự trong mã là thứ tự của điện thoại: khối «tóm tắt xe», khối «Giấy tờ xe», thanh việc (vùng nội
// dung từ 560 lên đầu trang: «Thêm giấy tờ», «Sửa thông tin xe»), «Thêm giấy tờ» dính đáy ở điện thoại. Khối giấy tờ rộng từ 800 hiện bảng, hẹp hơn hiện
// danh sách dòng (do tệp kiểu quyết theo bề rộng khối).
import { chipHan, lichSuCua, loaiThemDuocChoXe, ngayVN, tenXe, tomTatGiayToXe, xepTheoHan } from "../src/shared/giay-to-hien-thi";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { alertEl, chipEl, chipTrangThaiXe, datCrumb, loiCua, moFormGiayTo, type GiayToDong } from "./giay-to-ui";
import { icon } from "./icons";
import { cap, khoi, luoi, thanhViec } from "./khung";
import { TRANG } from "../src/shared/muc-giao-dien";
import { initShell, showError } from "./shell";
import { trangThaiToanTrang } from "./trang-thai-he-thong";

const errorEl = byId("error");
const vungEl = byId("xe");
const wrapEl = byId("docs-wrap");
const retiredEl = byId("xe-retired");
const tableEl = byId("docs-table");
const rowsEl = byId("docs-rows");
const listEl = byId("docs-list");
const bottomEl = byId("xe-bottom"); // thanh dính đáy viết sẵn trong trang (như web/xe-sua.ts); mỗi lần vẽ được đặt lại cuối vùng vẽ
const themDay = byId<HTMLButtonElement>("add-doc-bottom");
const id = new URLSearchParams(location.search).get("id") ?? "";
const url = `/api/van-chuyen/xe/${encodeURIComponent(id)}`;

let xe: Api.VehicleDto;
let docs: Api.VehicleDocumentDto[] = [];
let meta: Api.VanChuyenMetaResponse;
const moLichSu = new Set<string>();

const dongCua = (d: Api.VehicleDocumentDto): GiayToDong => ({
  typeCode: d.typeCode, typeName: d.typeName, className: null, classCode: null, soHien: d.number, issuedDate: d.issuedDate, issuedPlace: null, expiryDate: d.expiryDate, updatedAt: d.updatedAt,
});

/** Mở bảng Thêm / Gia hạn / Sửa sai; lưu xong dựng lại trang bằng phản hồi của máy chủ (VehicleResponse). Dòng đã cũ (409) → nạp lại ngầm rồi báo câu của máy chủ. */
function moBang(kind: "add" | "renew" | "fix", opener: HTMLElement, d?: Api.VehicleDocumentDto): void {
  const duongDan = kind === "add" ? `${url}/giay-to` : `${url}/giay-to/${encodeURIComponent(d!.id)}/${kind === "renew" ? "gia-han" : "sua-sai"}`;
  moFormGiayTo({
    kind,
    cho: "xe",
    opener,
    types: kind === "add" ? loaiThemDuocChoXe(meta.documentTypes, docs) : meta.documentTypes,
    doc: d ? dongCua(d) : undefined,
    gui: async (body) => {
      try {
        const r = await api<Api.VehicleResponse>(duongDan, { method: "POST", body });
        xe = r.vehicle;
        docs = r.documents;
        ve();
        byId("docs-title").focus();
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) void napLai();
        throw err;
      }
    },
  });
}

/** Hai nút của một giấy tờ («Sửa sai», «Gia hạn»); xe đã ngừng hoặc giấy không hạn thì không có «Gia hạn». */
function nutDong(d: Api.VehicleDocumentDto, ngung: boolean): HTMLButtonElement[] {
  const suaSai = h("button", { type: "button", class: "nut", "data-cap": "phu" }, "Sửa sai");
  suaSai.addEventListener("click", () => moBang("fix", suaSai, d));
  if (!d.expiryDate || ngung) return [suaSai];
  const giaHan = h("button", { type: "button", class: "nut", "data-cap": "phu" }, "Gia hạn");
  giaHan.addEventListener("click", () => moBang("renew", giaHan, d));
  return [suaSai, giaHan];
}

/** Nút «Lịch sử (N)» mở / đóng các dòng cũ ngay dưới giấy tờ (chữ có số đếm nên không viết liền được). */
function nutLichSu(d: Api.VehicleDocumentDto, soDong: number): HTMLButtonElement {
  const mo = moLichSu.has(d.id);
  const b = h("button", { type: "button", class: "nut", "data-cap": "loi", "aria-expanded": String(mo), "data-hist-for": d.id }, `Lịch sử (${soDong})`, icon("chevron-down", 16, 2));
  b.addEventListener("click", () => {
    if (moLichSu.has(d.id)) moLichSu.delete(d.id);
    else moLichSu.add(d.id);
    const trongBang = tableEl.contains(b);
    ve();
    (trongBang ? tableEl : listEl).querySelector<HTMLElement>(`[data-hist-for="${CSS.escape(d.id)}"]`)?.focus();
  });
  return b;
}

const DA_THAY = { tone: "muted", text: "Đã thay", icon: false } as const;

function ve(): void {
  const ngung = xe.status === "retired";
  const hienHanh = xepTheoHan(docs.filter((d) => d.current && !d.voided));
  const tomTat = tomTatGiayToXe(hienHanh, meta.warnDays);
  const sua = `/xe-sua?id=${encodeURIComponent(xe.id)}`;
  // ADR-0056 VK3-B: xe đã có đủ các loại đang dùng thì không còn gì để "Thêm" — nút tắt, chữ nói rõ phải làm gì (máy chủ vẫn chặn 409).
  const duLoai = loaiThemDuocChoXe(meta.documentTypes, docs).length === 0;
  const themTren = h("button", { type: "button", class: "nut", "data-cap": "chinh", "data-chi": "rong" }, "Thêm giấy tờ");
  themTren.prepend(icon("plus", 18));
  themTren.addEventListener("click", () => moBang("add", themTren));
  themTren.disabled = duLoai;
  themDay.disabled = duLoai;
  retiredEl.hidden = !ngung;

  // Thanh việc: nút chính đứng đầu, «Sửa thông tin xe» cạnh nó; câu «đủ loại» một hàng riêng. Ở điện thoại hai nút của thanh này ẩn (bản thứ hai của chúng:
  // «Thêm giấy tờ» dính đáy, «Sửa thông tin xe» cuối khối tóm tắt) — chỉ câu «đủ loại» còn hiện, đứng ngay trên nút dính đáy.
  const coCauDu = !ngung && duLoai;
  const viec = thanhViec(
    { id: "xe-viec", "data-len-dau": "", "data-chi": coCauDu ? undefined : "rong" },
    ngung ? null : themTren,
    h("a", { class: "nut", "data-cap": "phu", "data-chi": "rong", href: sua }, "Sửa thông tin xe"),
    coCauDu ? h("p", { class: "khoi-mo-ta" }, "Xe đã có đủ các loại giấy tờ — dùng Gia hạn hoặc Sửa sai.") : null,
  );

  // Khối tóm tắt xe: các cặp nhãn – giá trị trên lưới hai nửa (khối hẹp thì một cột), rồi tình trạng giấy tờ.
  const nua = { thuoc: { "data-cot": 6 } };
  const tomTatXe = khoi(
    { thuoc: { id: "xe-head" } },
    luoi(
      null,
      cap("Biển số", xe.plateNumber, nua),
      cap("Trạng thái", chipTrangThaiXe(xe.status), nua),
      cap("Tên / đời xe", tenXe(xe), nua),
      cap("Số người", `${xe.passengerCapacity} người (không kể tài xế)`, nua),
      cap("Chủ xe", xe.ownerName, nua), // ADR-0048 D1 (Task B3): công ty chủ hoặc nhà xe đối tác
    ),
    alertEl(tomTat.tone, tomTat.text),
    h("div", { class: "hang", "data-chi": "hep" }, h("a", { class: "nut", "data-cap": "phu", href: sua }, "Sửa thông tin xe")),
  );

  // Khối hẹp hơn 800 (điện thoại, máy tính bảng): mỗi giấy một dòng — loại + chip, dòng "Số · cấp · hết hạn", lịch sử mở ngay dưới; nút cuối dòng.
  const dong = hienHanh.map((d) => {
    const cu = lichSuCua(d, docs);
    const phu = [d.number ? `Số ${d.number}` : null, d.issuedDate ? `cấp ${ngayVN(d.issuedDate)}` : null, d.expiryDate ? `hết hạn ${ngayVN(d.expiryDate)}` : "không hạn"].filter(Boolean).join(" · ");
    return h(
      "div",
      { class: "dong", "data-giay-to": d.typeCode },
      h(
        "div",
        { class: "dong-chu" },
        h("div", null, h("strong", null, d.typeName), " ", chipEl(chipHan(d.daysLeft, meta.warnDays))),
        h("span", { class: "o-phu" }, phu),
        cu.length ? h("div", null, nutLichSu(d, cu.length)) : null,
        moLichSu.has(d.id) && cu.length
          ? h(
              "div",
              { class: "vc-hist" },
              ...cu.map((o) =>
                h(
                  "div",
                  { class: "vc-hist-row" },
                  h("span", null, `${o.number ? `${o.number} · ` : ""}${o.issuedDate ? ngayVN(o.issuedDate) : "—"} → ${o.expiryDate ? ngayVN(o.expiryDate) : "không hạn"}`),
                  chipEl(DA_THAY),
                ),
              ),
            )
          : null,
      ),
      h("div", { class: "hang" }, ...nutDong(d, ngung)), // hai nút đi cùng nhau: dòng chật thì cả cụm xuống dưới chữ
    );
  });
  replaceChildren(listEl, ...dong);

  // Khối từ 800: bảng Loại · số · ngày cấp | Hết hạn | Còn | nút; dòng cũ mở ngay dưới dòng.
  replaceChildren(
    rowsEl,
    ...hienHanh.flatMap((d) => {
      const cu = lichSuCua(d, docs);
      const phu = [d.number ? `Số ${d.number}` : null, d.issuedDate ? `cấp ${ngayVN(d.issuedDate)}` : null].filter(Boolean).join(" · ") || "—";
      return [
        h(
          "tr",
          { "data-giay-to": d.typeCode },
          h("td", null, d.typeName, h("span", { class: "o-phu" }, phu), cu.length ? nutLichSu(d, cu.length) : null),
          h("td", { "data-gon": "" }, d.expiryDate ? ngayVN(d.expiryDate) : "Không hạn"),
          h("td", null, chipEl(chipHan(d.daysLeft, meta.warnDays))),
          h("td", null, h("div", { class: "hang" }, ...nutDong(d, ngung))),
        ),
        ...(moLichSu.has(d.id)
          ? cu.map((o) =>
              h(
                "tr",
                { "data-dong-cu": "" },
                h("td", null, h("span", { class: "o-phu" }, `↳ Dòng cũ · ${o.number ?? "—"} · cấp ${o.issuedDate ? ngayVN(o.issuedDate) : "—"}`)),
                h("td", { "data-gon": "" }, h("span", { class: "o-phu" }, o.expiryDate ? ngayVN(o.expiryDate) : "Không hạn")),
                h("td", null, chipEl(DA_THAY)),
                h("td", null),
              ),
            )
          : []),
      ];
    }),
  );
  // Chưa có giấy tờ: ẩn cả bảng lẫn danh sách dòng, một câu rỗng trong khối (đúng ở mọi bề rộng khối).
  tableEl.hidden = hienHanh.length === 0;
  listEl.hidden = hienHanh.length === 0;
  wrapEl.querySelector(":scope > p.rong")?.remove();
  if (hienHanh.length === 0) wrapEl.append(h("p", { class: "rong" }, "Chưa có giấy tờ nào."));
  wrapEl.hidden = false;

  bottomEl.hidden = ngung;
  replaceChildren(vungEl, h("h1", null, xe.plateNumber), tomTatXe, wrapEl, viec, bottomEl);
}

async function napLai(): Promise<void> {
  const r = await api<Api.VehicleResponse>(url);
  xe = r.vehicle;
  docs = r.documents;
  ve();
}

await initShell();
themDay.prepend(icon("plus", 20));
themDay.addEventListener("click", () => moBang("add", themDay));
if (!id) {
  trangThaiToanTrang("thieu-ma", { doiTuong: "xe", trangCha: { nhan: "Xe & giấy tờ", href: TRANG.xe.duong } });
} else {
  try {
    const [r, m] = await Promise.all([api<Api.VehicleResponse>(url), api<Api.VanChuyenMetaResponse>("/api/van-chuyen/meta")]);
    xe = r.vehicle;
    docs = r.documents;
    meta = m;
    datCrumb("Vận chuyển › Xe", xe.plateNumber);
    document.title = `${xe.plateNumber} — Island Booking System`;
    ve();
  } catch (err) {
    showError(errorEl, loiCua(err));
  }
}
