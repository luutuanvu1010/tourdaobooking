import { can, seesAllOrders } from "../src/shared/permissions";
import { KHOANG_NHANH, LOC_TRONG, boDieuKien, chipLocDon, docLocDaNho, docLocDon, khoangNhanh, soDieuKienLoc, thamSoLocDon, type LocDonMan } from "../src/shared/loc-don";
import { STATUS_LABEL } from "../src/shared/order-status-label";
import { vnToday } from "../src/shared/vn-date";
import { moBangTruot } from "./bang-truot";
import { NO_HANDLER_TEXT, handlerText, nguoiPhuTrachTuPhien } from "../src/shared/handler-view";
import { ApiError, api, type OrderSummary, type Api, type Staff } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { soDongCanTai, taoBoLamMoi } from "./lam-moi-logic";
import { orderCard } from "./order-card";
import { goiSom } from "./goi-som";
import { initShell, showError } from "./shell";

const PAGE = 30;
const qInput = byId<HTMLInputElement>("q");
const locMo = byId<HTMLButtonElement>("loc-mo");
const locDem = byId("loc-dem");
const locChip = byId("loc-chip");
const listEl = byId("list");
const moreBtn = byId<HTMLButtonElement>("more");
const emptyEl = byId("empty");
const errorEl = byId("error");
const loadingEl = byId("loading");

let offset = 0;
let loadSeq = 0; // bỏ kết quả của lần tải cũ khi người dùng gõ tiếp
let moreLoading = false; // đang chạy "Tải thêm": làm mới theo tin đợi xong lượt này (nếu không, `loadSeq` của nó sẽ vứt kết quả của lượt "Tải thêm")
let refreshWaiting = false;
let lastLoadIsMore = false; // lần tải bắt đầu gần nhất là "Tải thêm" (nó là thứ có thể đã thay thế một lần làm mới đang bay)
const MAX_PAGE = 100; // `GET /api/orders` nhận limit tối đa 100

// ---- Bộ lọc nhiều điều kiện (góp ý T4 — chủ duyệt ảnh phác a, 30/9) -------------------------------------------------------------------------
// Nhớ bộ lọc lần trước TRÊN MÁY này (bộ nhớ trình duyệt; bị chặn / hỏng → không lọc). Luật đọc/kiểm/chip ở src/shared/loc-don.ts (cùng luật máy chủ).
const KHOA_NHO = "td.locDon.v1";
function docNho(): string | null {
  try {
    return localStorage.getItem(KHOA_NHO);
  } catch {
    return null;
  }
}
function ghiNho(l: LocDonMan): void {
  try {
    if (soDieuKienLoc(l) === 0) localStorage.removeItem(KHOA_NHO);
    else localStorage.setItem(KHOA_NHO, JSON.stringify(l));
  } catch {
    /* bộ nhớ bị chặn: chỉ không nhớ, vẫn lọc được */
  }
}
let loc: LocDonMan = docLocDaNho(docNho());
/** Mã tài khoản đang xem — cần cho "Đơn tôi lập"; có sau initShell(). */
let toiId = "";

/** Đường dẫn `GET /api/orders` theo bộ lọc/ô tìm đang hiện. */
function listUrl(base: number, limit: number): string {
  const params = new URLSearchParams({ limit: String(limit), offset: String(base) });
  if (qInput.value.trim()) params.set("q", qInput.value.trim());
  for (const [k, v] of thamSoLocDon(loc, toiId)) params.append(k, v);
  return `/api/orders?${params}`;
}

// Ô tìm kiếm trên thanh công việc (`web/shell.ts`) đưa người dùng về đây kèm `?q=…` (đặc tả Đợt D §47: dùng lại
// tham số `q` mà `GET /api/orders` đã hỗ trợ). ĐỔ VÀO Ô TÌM CỦA TRANG trước lần tải đầu, vì ba lý do: `load()` chỉ
// đọc `qInput.value` nên đây là chỗ duy nhất nối được; người dùng THẤY mình đang lọc theo gì; và sửa/xoá được ngay
// trên ô đó. Trước sửa này, gõ rồi Enter chỉ tải lại trang và hiện TOÀN BỘ danh sách (ô tìm là nút chết).
const qFromUrl = new URLSearchParams(location.search).get("q")?.trim();
if (qFromUrl) qInput.value = qFromUrl;
// Gọi sớm (web/goi-som.ts): lần tải đầu gửi NGAY, song song với /api/auth/me của initShell(). Chỉ lần `load()` ĐẦU TIÊN được dùng, và chỉ
// khi đường dẫn trùng; lần đầu đã bắt đầu thì bỏ hẳn — không để một lần tải sau (bộ lọc đổi rồi quay về mặc định) nhận nhầm bản chụp lúc mở trang
// (người kiểm độc lập 2026-09-27, phát hiện Important).
const urlDau = listUrl(0, PAGE);
// "Đơn tôi lập" cần mã người xem (chưa có lúc này) → bỏ gọi sớm, tải sau initShell().
let layDau: (() => Promise<Api.OrderListResponse>) | null = loc.cuaToi ? null : goiSom(() => api<Api.OrderListResponse>(urlDau));

/** Một thẻ đơn + chỗ ghi người phụ trách (điền sau khi `GET /api/dispatch/handlers` về). */
interface Row {
  id: string;
  el: HTMLElement;
  slot: HTMLElement;
}

function row(o: OrderSummary, index: number): Row {
  // Đợt E Phần A (bố cục sửa lại 2026-09-24): thẻ rút gọn 2 dòng + nút xổ xuống, dựng bằng thành phần dùng chung
  // web/order-card.ts (chỉ áp cho /orders ở đợt này — xem đặc tả 2026-09-23-dot-e-the-don-gon-va-bieu-tuong.md,
  // mục "Vòng sửa 2026-09-24"). `handlerSlot` thay cho `slot` cũ: vẫn cùng class `order-row-handler`/`is-pending`,
  // chỉ đổi CHỖ ĐỨNG (nay trong phần xổ xuống thay vì luôn hiện).
  const { el, handlerSlot } = orderCard({
    id: o.id,
    href: `/order?id=${encodeURIComponent(o.id)}`,
    orderCode: o.orderCode,
    status: o.status,
    departDate: o.trip.departDate,
    pickupTime: o.trip.pickupTime,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    pax: o.pax,
    depositAmount: o.depositAmount,
    remainingAmount: o.remainingAmount,
    total: o.total,
    serviceNames: o.serviceNames,
    staffName: o.staffName,
    createdAt: o.createdAt,
    customerNote: o.customerNote,
    pickupPlace: o.trip.pickupPlace,
    index,
  });
  return { id: o.id, el, slot: handlerSlot };
}

/**
 * Người phụ trách của các thẻ vừa dựng: MỘT lời gọi cho cả trang (`GET /api/dispatch/handlers?orderIds=…`, ≤ 30 mã ở đây, máy chủ nhận ≤ 100). Ba trạng thái, không hai:
 * chưa biết (chỗ trống rồi ẩn) · `null` = chưa có người (chip) · có tên. Lời gọi lỗi hoặc thiếu khoá cho một đơn → ẩn dòng đó, danh sách đơn không bị ảnh hưởng.
 * Thẻ đã bị thay (người dùng gõ tìm kiếm mới trong lúc chờ) thì `slot.isConnected` là false → bỏ qua.
 * Hướng dẫn viên (chỉ thấy đơn mình phụ trách — ADR-0030 S23-4): mọi thẻ là đơn của chính họ → tên từ phiên (`nguoiPhuTrachTuPhien`), KHÔNG gọi route
 * trên (403 với họ, không mở cho họ — ruling Task 1.6; vòng sửa 1 sau kiểm độc lập lượt 1, phát hiện I-2: trước đây dòng này bị ẩn lặng lẽ).
 */
async function fillHandlers(rows: readonly Row[]): Promise<void> {
  if (rows.length === 0) return;
  const tuPhien = nguoiPhuTrachTuPhien(await nhanVien);
  let handlers: Record<string, Api.HandlerDto | null> | null = null;
  if (tuPhien) handlers = Object.fromEntries(rows.map((r) => [r.id, tuPhien]));
  else {
    try {
      handlers = (await api<Api.HandlersResponse>(`/api/dispatch/handlers?orderIds=${rows.map((r) => encodeURIComponent(r.id)).join(",")}`)).handlers;
    } catch {
      handlers = null; // danh sách vẫn dùng được; chỉ thiếu dòng người phụ trách
    }
  }
  for (const { id, slot } of rows) {
    if (!slot.isConnected) continue;
    slot.classList.remove("is-pending");
    const found = handlers?.[id];
    if (found === null) replaceChildren(slot, h("span", { class: "chip chip-warn" }, NO_HANDLER_TEXT));
    else if (found && typeof found.name === "string" && found.name.trim() !== "") replaceChildren(slot, handlerText(found.name));
    else slot.hidden = true; // chưa biết (lỗi, hoặc phản hồi thiếu/sai dạng)
  }
}

/**
 * `refresh` = làm mới theo tin của Bảng tin (Task 9): giữ bộ lọc/ô tìm (đọc lại từ `qInput`/`statusSel`), KHÔNG hiện khung "đang tải", lỗi mạng thì
 * giữ danh sách cũ và không hiện lỗi, giữ vị trí cuộn, và xin `limit` = số dòng đang xem (sau "Tải thêm", tối đa 100) để không mất dòng đang xem.
 */
async function load(reset: boolean, refresh = false): Promise<void> {
  const seq = ++loadSeq;
  // KHÔNG đụng `offset` của module cho tới khi phản hồi được áp: lần tải lỗi/bị bỏ mà đã đặt lại `offset = 0` thì danh sách cũ vẫn trên màn hình
  // còn "Tải thêm" xin lại từ 0 → trùng dòng. Yêu cầu dùng `base` cục bộ; `offset` chỉ gán lúc render.
  const base = reset ? 0 : offset;
  lastLoadIsMore = !reset;
  if (reset) refreshWaiting = false; // tải mới hoàn toàn (lọc/tìm/làm mới) đã đọc dữ liệu mới nhất: không còn làm mới nào bị bỏ chờ
  const limit = refresh ? soDongCanTai(listEl.children.length, PAGE, MAX_PAGE) : PAGE;
  if (!refresh) showError(errorEl, null);
  if (reset && !refresh) loadingEl.hidden = false;
  const url = listUrl(base, limit);
  const som = layDau;
  layDau = null;
  try {
    const { orders, hasMore } = await (som && url === urlDau ? som() : api<Api.OrderListResponse>(url));
    if (seq !== loadSeq) {
      // Làm mới bị "Tải thêm" (bấm trong lúc chờ) thay thế: xếp lại để chạy lại, không để mất tin — sau khi "Tải thêm" xong (nếu còn chạy), hoặc ngay (nếu đã xong).
      if (refresh && lastLoadIsMore) {
        if (moreLoading) refreshWaiting = true;
        else void lamMoi.yeuCau();
      }
      return;
    }
    loadingEl.hidden = true;
    const rows = orders.map((o, i) => row(o, base + i + 1)); // số thứ tự nối tiếp khi "Tải thêm"; tìm/lọc mới đánh lại từ 1
    const scrollY = window.scrollY; // đọc LÚC dựng (không lúc bắt đầu tải): người dùng có thể đã cuộn trong lúc chờ
    if (reset) replaceChildren(listEl, ...rows.map((r) => r.el));
    else listEl.append(...rows.map((r) => r.el));
    if (refresh) window.scrollTo(0, scrollY);
    offset = base + orders.length;
    moreBtn.hidden = !hasMore;
    emptyEl.hidden = offset > 0;
    void fillHandlers(rows); // không chờ: danh sách hiện ngay, người phụ trách điền vào khi về
  } catch (err) {
    // Làm mới lặng lẽ giữ danh sách cũ — trừ khi khung "đang tải" của lần tải ĐẦU (bị làm mới này thay thế) còn hiện: lúc đó phải báo lỗi, không để trang kẹt.
    if (seq === loadSeq && (!refresh || !loadingEl.hidden)) {
      loadingEl.hidden = true;
      showError(errorEl, err instanceof ApiError ? err.message : "Không tải được danh sách.");
    }
  }
}

/** Làm mới theo tin: MỘT lần tải mỗi lúc (bộ gộp), và không chen vào lượt "Tải thêm" đang chạy. */
const lamMoi = taoBoLamMoi(async () => {
  if (moreLoading) {
    refreshWaiting = true;
    return;
  }
  await load(true, true);
});

async function loadMore(): Promise<void> {
  moreLoading = true;
  try {
    await load(false);
  } finally {
    moreLoading = false;
    if (refreshWaiting) {
      refreshWaiting = false;
      void lamMoi.yeuCau();
    }
  }
}

let timer: number | undefined;
qInput.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => void load(true), 300);
});
locMo.addEventListener("click", () => moBoLoc());
moreBtn.addEventListener("click", () => void loadMore());
// Bảng tin (ADR-0022, TD-3): đơn đổi ở nơi khác / vừa nối lại → tải lại danh sách. Đăng ký MỘT lần ở đây (đầu trang), không trong hàm dựng lại.
window.addEventListener("don-thay-doi", () => void lamMoi.yeuCau());
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());

/** Danh mục cho ô "Dịch vụ": người xem mọi đơn đọc `/api/catalog` (văn phòng); người lập đơn còn lại `/api/catalog/for-order`; Hướng dẫn viên
 *  (không đọc danh mục giá — ADR-0019 điều 3) → null: ẩn ô dịch vụ, KHÔNG gọi route sẽ 403. Tải một lần, khi cần. */
let danhMuc: Promise<{ code: string; name: string }[] | null> | null = null;
const tenDv = new Map<string, string>();
function layDanhMuc(who: Staff): Promise<{ code: string; name: string }[] | null> {
  danhMuc ??= (async () => {
    const url = seesAllOrders(who) ? "/api/catalog" : can(who, "order.create") ? "/api/catalog/for-order" : null;
    if (!url) return null;
    try {
      const ds = (await api<Api.CatalogPublicResponse>(url)).items.map((x) => ({ code: x.code, name: x.name }));
      for (const x of ds) tenDv.set(x.code, x.name);
      return ds;
    } catch {
      return null;
    }
  })();
  return danhMuc;
}

function apDungLoc(moi: LocDonMan): void {
  loc = moi;
  ghiNho(loc);
  veChip();
  void load(true);
}

/** Chip "đang lọc" + "Xoá lọc" ở đầu danh sách; số điều kiện trên nút "Lọc". */
function veChip(): void {
  const chip = chipLocDon(loc, tenDv);
  locDem.textContent = String(chip.length);
  locDem.hidden = chip.length === 0;
  locMo.setAttribute("aria-label", chip.length ? `Lọc đơn — đang lọc ${chip.length} điều kiện` : "Lọc đơn");
  locChip.hidden = chip.length === 0;
  replaceChildren(
    locChip,
    ...chip.map((c) =>
      h("span", { class: "loc-chip-muc", "data-khoa": c.khoa }, c.nhan,
        h("button", { type: "button", class: "loc-chip-bo", "aria-label": `Bỏ lọc ${c.nhan}`, onclick: () => apDungLoc(boDieuKien(loc, c.khoa)) }, "×"))),
    chip.length ? h("button", { type: "button", class: "btn btn-link loc-xoa", onclick: () => apDungLoc(LOC_TRONG) }, "Xoá lọc") : null,
  );
}

/** Nút bật/tắt (aria-pressed) dùng chung cho chọn nhanh ngày và trạng thái. */
function nutBat(nhan: string, bat: boolean, onBam: (b: HTMLButtonElement) => void, data: Record<string, string> = {}): HTMLButtonElement {
  const b = h("button", { type: "button", class: "loc-nut", "aria-pressed": String(bat), ...data }, nhan) as HTMLButtonElement;
  b.addEventListener("click", () => onBam(b));
  return b;
}

/** Bảng trượt "Lọc đơn" (điện thoại: từ đáy; máy tính: hộp giữa màn — khuôn chung `moBangTruot`). Chọn nhiều điều kiện rồi "Áp dụng". */
function moBoLoc(): void {
  const who = staffDaCo;
  if (!who) return;
  let nhap: LocDonMan = { ...loc, dichVu: [...loc.dichVu], trangThai: [...loc.trangThai] };
  const homNay = vnToday(new Date());
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });

  // Ngày đi: bốn nút chọn nhanh + hai ô ngày.
  const tu = h("input", { type: "date", id: "loc-tu", value: nhap.tu ?? "" }) as HTMLInputElement;
  const den = h("input", { type: "date", id: "loc-den", value: nhap.den ?? "" }) as HTMLInputElement;
  const danhDauNhanh = (): void => {
    for (const [i, k] of KHOANG_NHANH.entries()) {
      const r = khoangNhanh(k.khoa, homNay);
      nhanh[i]!.setAttribute("aria-pressed", String(tu.value === r.tu && den.value === r.den));
    }
  };
  const nhanh = KHOANG_NHANH.map((k) =>
    nutBat(k.nhan, false, () => {
      const r = khoangNhanh(k.khoa, homNay);
      tu.value = r.tu;
      den.value = r.den;
      danhDauNhanh();
    }, { "data-nhanh": k.khoa }));
  tu.addEventListener("change", danhDauNhanh);
  den.addEventListener("change", danhDauNhanh);
  danhDauNhanh();

  // Trạng thái: ba nút bật/tắt.
  const trangThai = (["draft", "confirmed", "cancelled"] as const).map((t) =>
    nutBat(STATUS_LABEL[t], nhap.trangThai.includes(t), (b) => {
      nhap.trangThai = nhap.trangThai.includes(t) ? nhap.trangThai.filter((x) => x !== t) : [...nhap.trangThai, t];
      b.setAttribute("aria-pressed", String(nhap.trangThai.includes(t)));
    }, { "data-trang-thai": t }));

  // Dịch vụ: ô tìm + danh sách ô tích (tải danh mục khi mở bảng).
  const dvDem = h("span", { class: "loc-nhom-dem" });
  const dvTim = h("input", { type: "search", id: "loc-dv-tim", placeholder: "Tìm dịch vụ…", autocomplete: "off", "aria-label": "Tìm dịch vụ" }) as HTMLInputElement;
  const dvDs = h("div", { class: "loc-dv-ds" }, h("p", { class: "muted" }, "Đang tải danh mục…"));
  const dvNhom = h("fieldset", { class: "loc-nhom", "data-nhom": "dichVu" }, h("legend", null, "Dịch vụ ", dvDem), dvTim, dvDs);
  const veDemDv = (): void => {
    dvDem.textContent = nhap.dichVu.length ? `· ${nhap.dichVu.length} đã chọn` : "";
  };
  veDemDv();
  let ds: { code: string; name: string }[] = [];
  const veDv = (): void => {
    const kim = dvTim.value.trim().toLowerCase();
    // Đã chọn luôn đứng đầu (kể cả mã không còn trong danh mục) để bỏ chọn được.
    const conLai = ds.filter((x) => !nhap.dichVu.includes(x.code) && (!kim || x.name.toLowerCase().includes(kim) || x.code.toLowerCase().includes(kim))).slice(0, 40);
    const dong = [...nhap.dichVu.map((c) => ({ code: c, name: tenDv.get(c) ?? c })), ...conLai];
    replaceChildren(
      dvDs,
      ...(dong.length
        ? dong.map((x) => {
            const o = h("input", { type: "checkbox", checked: nhap.dichVu.includes(x.code), "data-dv": x.code }) as HTMLInputElement;
            o.addEventListener("change", () => {
              nhap.dichVu = o.checked ? [...nhap.dichVu, x.code] : nhap.dichVu.filter((c) => c !== x.code);
              veDemDv();
            });
            return h("label", { class: "loc-dv" }, o, h("span", null, h("strong", null, x.code), " · ", x.name));
          })
        : [h("p", { class: "muted" }, "Không có dịch vụ khớp.")]),
    );
  };
  dvTim.addEventListener("input", veDv);
  void layDanhMuc(who).then((r) => {
    if (r === null) {
      dvNhom.hidden = true; // không đọc được danh mục (Hướng dẫn viên / lỗi mạng): ẩn ô, các điều kiện khác vẫn dùng được
      return;
    }
    ds = r;
    veDv();
  });

  // Người lập: chỉ người xem mọi đơn (chủ duyệt 30/9). Chưa có nguồn danh sách người lập cho mọi vai → "Mọi người" / "Đơn tôi lập".
  const nguoi = seesAllOrders(who)
    ? h("select", { id: "loc-nguoi", onchange: (e: Event) => (nhap.cuaToi = (e.target as HTMLSelectElement).value === "toi") },
        h("option", { value: "", selected: !nhap.cuaToi }, "Mọi người"), h("option", { value: "toi", selected: nhap.cuaToi }, "Đơn tôi lập"))
    : null;

  const huy = h("button", { type: "button", class: "btn" }, "Huỷ");
  const apDung = h("button", { type: "button", class: "btn btn-primary", "data-action": "ap-dung-loc" }, "Áp dụng");
  const xoa = h("button", { type: "button", class: "btn btn-link", "data-action": "xoa-loc" }, "Xoá lọc");
  const bang = moBangTruot({
    title: "Lọc đơn",
    body: [
      h("fieldset", { class: "loc-nhom", "data-nhom": "ngay" }, h("legend", null, "Ngày đi"), h("div", { class: "loc-nut-hang" }, ...nhanh),
        h("div", { class: "loc-ngay" }, h("label", null, "Từ ngày", tu), h("label", null, "Đến ngày", den))),
      h("fieldset", { class: "loc-nhom", "data-nhom": "trangThai" }, h("legend", null, "Trạng thái"), h("div", { class: "loc-nut-hang" }, ...trangThai)),
      dvNhom,
      nguoi ? h("label", { class: "loc-nhom" }, "Người lập", nguoi) : null,
      loi,
    ],
    foot: [xoa, huy, apDung],
    footClass: "loc-foot",
    opener: locMo,
  });
  if (!bang) return;
  huy.addEventListener("click", () => bang.close());
  xoa.addEventListener("click", () => {
    bang.close();
    apDungLoc(LOC_TRONG);
  });
  apDung.addEventListener("click", () => {
    nhap = { ...nhap, tu: tu.value || null, den: den.value || null };
    const kiem = docLocDon(new URLSearchParams(thamSoLocDon(nhap, toiId || "x")));
    if (!kiem.ok) {
      replaceChildren(loi, kiem.message);
      loi.hidden = false;
      return;
    }
    bang.close();
    apDungLoc(nhap);
  });
}

// Nút "+ Đơn mới" mặc định ẩn trong HTML tĩnh, chỉ hiện cho người được lập đơn (bản đồ quyền ADR-0007 — không chép ma trận ở đây):
// tài khoản chỉ-ACCOUNTING bấm vào sẽ bị máy chủ từ chối 403 sau khi đã điền cả form.
// Tra cứu chịu được phần tử VẮNG (như setBarTitle ở shell.ts): nếu một bản HTML cũ còn nằm trong cache mà JS đã mới thì thiếu nút
// vẫn phải để trang đơn hàng chạy bình thường — mặc định ẩn nên không có nút cũng là phía an toàn.
// `nhanVien` gọi `initShell()` TRƯỚC lần `await` đầu tiên của trang, nên mọi hàm gọi lại (ô tìm, bộ lọc, Bảng tin — chỉ chạy được sau khi trang nhường luồng)
// đọc được nó; `fillHandlers` chờ nó để biết người đang xem có phải hướng dẫn viên không.
let staffDaCo: Staff | null = null;
const nhanVien = initShell();
const staff = await nhanVien;
staffDaCo = staff;
const newOrderBtn = document.getElementById("new-order");
if (newOrderBtn) newOrderBtn.hidden = !can(staff, "order.create");
toiId = staff.id;
if (loc.cuaToi && !seesAllOrders(staff)) loc = { ...loc, cuaToi: false }; // bộ lọc nhớ của tài khoản khác trên cùng máy: ô này chỉ cho người xem mọi đơn
veChip();
if (loc.dichVu.length) void layDanhMuc(staff).then(() => veChip()); // tên dịch vụ cho chip của bộ lọc đã nhớ


await load(true);
