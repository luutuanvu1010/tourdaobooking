// Chi tiết xe + giấy tờ xe (/xe-chi-tiet?id=<xe> — ADR-0040 D1; bản vẽ docs/design/van-chuyen-1a/project/03 Chi tiet xe.dc.html).
// Giấy tờ xếp đã hết hạn → sắp hết hạn → còn hạn → không hạn (quyết định thiết kế 3); "Lịch sử (N)" mở ngay dưới dòng (dòng cũ nền xám + "Đã thay"); "Gia hạn" =
// dòng mới, "Sửa sai" = lý do bắt buộc (danh sách đóng của máy chủ, chỉ lý do dùng cho xe). Điện thoại: danh sách + "Thêm giấy tờ" dính đáy; máy tính (≥900px):
// bảng, nút ở đầu thẻ. Xe đã ngừng: không thêm, không gia hạn (máy chủ trả 409 vehicle_retired) — vẫn sửa sai được. Số giấy tờ XE hiện đủ (không phải dữ liệu
// cá nhân — giả định G4 của kế hoạch). GET /api/van-chuyen/xe/:id + /api/van-chuyen/meta (loại giấy tờ, mốc nhắc).
import { chipHan, lichSuCua, ngayVN, tenXe, tomTatGiayToXe, xepTheoHan } from "../src/shared/giay-to-hien-thi";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { alertEl, chipEl, chipTrangThaiXe, datCrumb, loiCua, moFormGiayTo, type GiayToDong } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const headEl = byId("xe-head");
const retiredEl = byId("xe-retired");
const wrapEl = byId("docs-wrap");
const listEl = byId("docs-list");
const tableEl = byId("docs-table");
const bottomEl = byId("xe-bottom");
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
    types: meta.documentTypes,
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

function nut(chu: string, lop: string, bam: (b: HTMLButtonElement) => void): HTMLButtonElement {
  const b = h("button", { type: "button", class: `vc-btn ${lop}` }, chu);
  b.addEventListener("click", () => bam(b));
  return b;
}

function nutLichSu(d: Api.VehicleDocumentDto, soDong: number, lop = "vc-btn vc-btn-text vc-hist-toggle"): HTMLButtonElement {
  const mo = moLichSu.has(d.id);
  const b = h("button", { type: "button", class: lop, "aria-expanded": String(mo), "data-hist-for": d.id }, `Lịch sử (${soDong})`, icon("chevron-down", 16, 2));
  b.addEventListener("click", () => {
    if (moLichSu.has(d.id)) moLichSu.delete(d.id);
    else moLichSu.add(d.id);
    const trongBang = tableEl.contains(b);
    ve();
    (trongBang ? tableEl : listEl).querySelector<HTMLElement>(`[data-hist-for="${CSS.escape(d.id)}"]`)?.focus();
  });
  return b;
}

function ve(): void {
  const ngung = xe.status === "retired";
  const hienHanh = xepTheoHan(docs.filter((d) => d.current && !d.voided));
  const tomTat = tomTatGiayToXe(hienHanh, meta.warnDays);
  const sua = `/xe-sua?id=${encodeURIComponent(xe.id)}`;
  const themTren = nut("Thêm giấy tờ", "btn btn-primary", (b) => moBang("add", b));
  themTren.prepend(icon("plus", 18));
  replaceChildren(
    headEl,
    h(
      "div",
      { class: "vc-xe-head-main" },
      h("div", { class: "vc-row-between" }, h("h1", { class: "vc-plate" }, xe.plateNumber), chipTrangThaiXe(xe.status)),
      h("div", { class: "vc-xe-sub" }, `${tenXe(xe)} · ${xe.passengerCapacity} người `, h("span", { class: "muted" }, "(không kể tài xế)")),
      h("a", { class: "vc-link-edit", href: sua }, "Sửa thông tin xe"),
    ),
    h("div", { class: "vc-xe-head-actions" }, h("a", { class: "vc-btn vc-btn-ghost-primary", href: sua }, "Sửa thông tin xe"), ngung ? null : themTren),
    alertEl(tomTat.tone, tomTat.text),
  );
  headEl.hidden = false;
  retiredEl.hidden = !ngung;
  bottomEl.hidden = ngung;

  // Điện thoại (<900px): mỗi giấy một khối — loại + chip, dòng "Số · cấp · hết hạn", nút Gia hạn / Sửa sai / Lịch sử.
  const khoi = hienHanh.map((d) => {
    const cu = lichSuCua(d, docs);
    const dong = [d.number ? `Số ${d.number}` : null, d.issuedDate ? `cấp ${ngayVN(d.issuedDate)}` : null, d.expiryDate ? `hết hạn ${ngayVN(d.expiryDate)}` : "không hạn"].filter(Boolean).join(" · ");
    return h(
      "div",
      { class: "vc-doc" },
      h("div", { class: "vc-doc-top" }, h("span", { class: "vc-doc-title" }, d.typeName), chipEl(chipHan(d.daysLeft, meta.warnDays))),
      h("div", { class: "vc-doc-line" }, dong),
      h(
        "div",
        { class: "vc-doc-btns" },
        d.expiryDate && !ngung ? nut("Gia hạn", "vc-btn-line", (b) => moBang("renew", b, d)) : null,
        nut("Sửa sai", "vc-btn-ghost", (b) => moBang("fix", b, d)),
        cu.length ? nutLichSu(d, cu.length) : null,
      ),
      moLichSu.has(d.id) && cu.length
        ? h(
            "div",
            { class: "vc-hist" },
            ...cu.map((o) =>
              h(
                "div",
                { class: "vc-hist-row" },
                h("span", null, `${o.number ? `${o.number} · ` : ""}${o.issuedDate ? ngayVN(o.issuedDate) : "—"} → ${o.expiryDate ? ngayVN(o.expiryDate) : "không hạn"}`),
                h("span", { class: "vc-pill-old" }, "Đã thay"),
              ),
            ),
          )
        : null,
    );
  });
  const trong = h("p", { class: "vc-empty-line" }, "Chưa có giấy tờ nào.");
  replaceChildren(listEl, ...(khoi.length ? khoi : [trong]));

  // Máy tính (≥900px): bảng LOẠI · SỐ · NGÀY CẤP | HẾT HẠN | CÒN | nút; dòng cũ mở ngay dưới dòng.
  replaceChildren(
    tableEl,
    h("div", { class: "vc-dt-grid vc-dt-head vc-th", "aria-hidden": "true" }, h("span", null, "LOẠI · SỐ · NGÀY CẤP"), h("span", null, "HẾT HẠN"), h("span", null, "CÒN"), h("span", null, "")),
    ...(hienHanh.length
      ? hienHanh.map((d) => {
          const cu = lichSuCua(d, docs);
          const phu = [d.number ? `Số ${d.number}` : null, d.issuedDate ? `cấp ${ngayVN(d.issuedDate)}` : null].filter(Boolean).join(" · ") || "—";
          return h(
            "div",
            { class: "vc-dt-item" },
            h(
              "div",
              { class: "vc-dt-grid vc-dt-row" },
              // "Lịch sử (N)" dưới tên loại (bản vẽ đặt ở cột nút rộng 250px — ba nút không vừa, chữ nút gãy dòng; ghi ở nhật ký thi công).
              h("span", { class: "vc-dt-type" }, h("span", { class: "vc-doc-title" }, d.typeName), h("span", { class: "vc-doc-sub" }, phu), cu.length ? nutLichSu(d, cu.length, "vc-reveal-link vc-hist-toggle") : null),
              h("span", { class: "vc-dt-exp" }, d.expiryDate ? ngayVN(d.expiryDate) : "Không hạn"),
              h("span", null, chipEl(chipHan(d.daysLeft, meta.warnDays))),
              h(
                "span",
                { class: "vc-dt-actions" },
                nut("Sửa sai", "vc-btn-ghost", (b) => moBang("fix", b, d)),
                d.expiryDate && !ngung ? nut("Gia hạn", "vc-btn-line", (b) => moBang("renew", b, d)) : null,
              ),
            ),
            ...(moLichSu.has(d.id)
              ? cu.map((o) =>
                  h(
                    "div",
                    { class: "vc-dt-grid vc-dt-hist" },
                    h("span", null, `↳ Dòng cũ · ${o.number ?? "—"} · cấp ${o.issuedDate ? ngayVN(o.issuedDate) : "—"}`),
                    h("span", null, o.expiryDate ? ngayVN(o.expiryDate) : "Không hạn"),
                    h("span", null, h("span", { class: "vc-pill-old" }, "Đã thay")),
                    h("span", null),
                  ),
                )
              : []),
          );
        })
      : [h("p", { class: "vc-empty-line" }, "Chưa có giấy tờ nào.")]),
  );
  wrapEl.hidden = false;
}

async function napLai(): Promise<void> {
  const r = await api<Api.VehicleResponse>(url);
  xe = r.vehicle;
  docs = r.documents;
  ve();
}

await initShell();
const themDay = byId("add-doc-bottom");
themDay.prepend(icon("plus", 20));
themDay.addEventListener("click", () => moBang("add", themDay));
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
