// Trang "Trợ lý Hỗ trợ" (/tro-ly-cai-dat — ADR-0069): bảng điều khiển trợ lý AI của Toàn quyền (ô settings.ops; máy chủ kiểm lại ở MỌI route).
// Năm phần theo đặc tả mục 2: Tình trạng (bật / tắt, key đã đặt + 4 ký tự cuối, Thử key, chi phí), Ai được dùng (9 công tắc + trần ngày), Lời dặn (+ lịch sử
// bản, quay lại), Ngữ cảnh bổ sung, Lịch sử hỏi đáp (lọc ngày / người / vai, tìm chữ). Không innerHTML; chữ người dùng hiện bằng textContent.
// Không import src/shared/tro-ly.ts (kéo cả kho tri thức vào bundle): giới hạn độ dài lấy từ tệp riêng tro-ly-gioi-han.ts; câu lỗi lời thường do máy chủ soạn.
import { GIOI_HAN_TRO_LY as G } from "../src/shared/tro-ly-gioi-han";
import { PERMISSION_CODES, PERMISSION_LABEL, can, type PermissionCode } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { dateTime } from "./format";
import { initShell, showError } from "./shell";

const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";
const loiCua = (e: unknown): string => (e instanceof ApiError ? e.message : LOI_MANG);
const usd = (n: number): string => `${n.toLocaleString("vi-VN", { maximumFractionDigits: 4 })} USD`;

const errorEl = byId("error");
const trang = byId("tl-trang");
const staff = await initShell();

/** Dòng báo kết quả dưới một nút (thành công / lỗi), đọc được bằng trình đọc màn hình. */
function dongBao(): { el: HTMLElement; ok: (s: string) => void; loi: (s: string) => void; xoa: () => void } {
  const el = h("p", { class: "tl-cd-bao", role: "status", hidden: true });
  return {
    el,
    ok: (s) => { el.textContent = s; el.className = "tl-cd-bao"; el.hidden = false; },
    loi: (s) => { el.textContent = s; el.className = "tl-cd-bao tl-cd-loi"; el.hidden = false; },
    xoa: () => { el.hidden = true; },
  };
}

async function bam(nut: HTMLButtonElement, bao: ReturnType<typeof dongBao>, viec: () => Promise<string | void>): Promise<void> {
  bao.xoa();
  nut.disabled = true;
  try {
    const s = await viec();
    if (s) bao.ok(s);
  } catch (e) {
    bao.loi(loiCua(e));
  } finally {
    nut.disabled = false;
  }
}

const oChu = (props: Record<string, unknown>): HTMLInputElement => h("input", { type: "text", autocomplete: "off", ...props });
const oVung = (props: Record<string, unknown>): HTMLTextAreaElement => h("textarea", { rows: 3, ...props });

// ---- 1 + 2. Tình trạng, Ai được dùng -----------------------------------------------------------------------------------------------------------------------

let caiDat: Api.TroLyCaiDatResponse;

function veTinhTrang(daLuu = false): void {
  const s = caiDat;
  const bat = h("input", { type: "checkbox", checked: s.bat, id: "tl-bat" });
  const tran = h("input", { type: "number", id: "tl-tran-thang", min: 0, max: 100, step: 0.5, value: String(s.tranThangUsd), inputmode: "decimal" });
  const luu = h("button", { class: "btn btn-primary", type: "submit" }, "Lưu");
  const bao = dongBao();
  const form = h("form", { class: "tl-cd-form" }, h("label", { class: "tl-cd-bat" }, bat, "Bật trợ lý cho cả công ty"), h("label", null, "Trần chi phí mỗi tháng (USD)", tran), luu, bao.el);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void bam(luu, bao, async () => {
      caiDat = await api<Api.TroLyCaiDatResponse>("/api/tro-ly/cai-dat", { method: "POST", body: { bat: bat.checked, tranThangUsd: Number(tran.value), tranNgay: caiDat.tranNgay } satisfies Api.TroLyCaiDatRequest });
      veTinhTrang(true);
      veAiDung();
    });
  });
  if (daLuu) bao.ok("Đã lưu.");
  const thu = h("button", { class: "btn", type: "button" }, "Thử key");
  const baoThu = dongBao();
  thu.addEventListener("click", () => void bam(thu, baoThu, async () => (await api<Api.TroLyThuKhoaResponse>("/api/tro-ly/thu-khoa", { method: "POST", body: {} })).cau));
  const [nam, thang] = s.thang.split("-");
  replaceChildren(
    byId("tl-tinh-trang"),
    h("h2", { id: "tl-tinh-trang-h" }, "Tình trạng"),
    h("p", null, s.bat ? "Đang bật." : "Đang tắt — không ai hỏi được."),
    h("p", null, s.coKhoa ? `Key: đã đặt${s.khoaCuoi ? ` (kết thúc bằng …${s.khoaCuoi})` : ""}.` : "Key: chưa đặt — trợ lý báo “chưa bật” tới khi có key."),
    h("p", { class: "muted" }, "Đổi key làm trên Cloudflare, không nhập trong app."),
    h("div", { class: "tl-cd-hang" }, thu),
    baoThu.el,
    h("p", null, `Tháng ${thang}/${nam}: đã dùng ${usd(s.chiPhiThangUsd)} trên trần ${usd(s.tranThangUsd)} · ${s.soCauThang} câu. Hôm nay: ${s.soCauHomNay} câu.`),
    s.theoVai.length
      ? h("ul", { class: "tl-cd-ds" }, ...s.theoVai.map((v) => h("li", null, `${PERMISSION_LABEL[v.vai]}: ${v.soCau} câu · ${usd(v.chiPhiUsd)}`)))
      : h("p", { class: "muted" }, "Tháng này chưa có câu hỏi nào theo vai."),
    form,
  );
}

function veAiDung(daLuu = false): void {
  const s = caiDat;
  const o = new Map<PermissionCode, HTMLInputElement>();
  const dong = PERMISSION_CODES.map((p) => {
    const c = h("input", { type: "checkbox", checked: s.vai[p], id: `tl-vai-${p}` });
    o.set(p, c);
    return h("label", { class: "tl-cd-bat" }, c, PERMISSION_LABEL[p]);
  });
  const ngay = h("input", { type: "number", id: "tl-tran-ngay", min: 0, max: 200, step: 1, value: String(s.tranNgay), inputmode: "numeric" });
  const luu = h("button", { class: "btn btn-primary", type: "submit" }, "Lưu");
  const bao = dongBao();
  const form = h(
    "form",
    { class: "tl-cd-form" },
    h("fieldset", { class: "tl-cd-vai" }, h("legend", null, "Vai được dùng trợ lý"), ...dong),
    h("p", { class: "muted" }, "Tài khoản có nhiều vai được dùng khi ít nhất một vai đang bật. Vai tắt không thấy nút Hỗ trợ."),
    h("label", null, "Số câu mỗi người mỗi ngày", ngay),
    luu,
    bao.el,
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void bam(luu, bao, async () => {
      const vai = Object.fromEntries(PERMISSION_CODES.map((p) => [p, o.get(p)!.checked])) as Record<PermissionCode, boolean>;
      await api<Api.TroLyCaiDatResponse>("/api/tro-ly/vai", { method: "POST", body: { vai } satisfies Api.TroLyVaiRequest });
      caiDat = await api<Api.TroLyCaiDatResponse>("/api/tro-ly/cai-dat", { method: "POST", body: { bat: caiDat.bat, tranThangUsd: caiDat.tranThangUsd, tranNgay: Number(ngay.value) } satisfies Api.TroLyCaiDatRequest });
      veTinhTrang();
      veAiDung(true);
    });
  });
  if (daLuu) bao.ok("Đã lưu.");
  replaceChildren(byId("tl-ai-dung"), h("h2", { id: "tl-ai-dung-h" }, "Ai được dùng"), form);
}

// ---- 3. Lời dặn ------------------------------------------------------------------------------------------------------------------------------------------

function veLoiDan(d: Api.TroLyLoiDanResponse, daLuu = false): void {
  const hh = d.hienHanh;
  const chao = oVung({ id: "tl-cau-chao", maxlength: G.cauChao, rows: 2, value: hh.cauChao });
  const giong = oChu({ id: "tl-giong", maxlength: G.giong, value: hh.giong, placeholder: "Ví dụ: thân thiện, ngắn gọn" });
  const dan = oVung({ id: "tl-loi-dan-them", maxlength: G.loiDanThem, rows: 4, value: hh.loiDanThem });
  const mau = oVung({ id: "tl-cau-mau", rows: 4, value: hh.cauHoiMau.join("\n"), placeholder: "Mỗi dòng một câu hỏi" });
  const luu = h("button", { class: "btn btn-primary", type: "submit" }, "Lưu thành bản mới");
  const bao = dongBao();
  const gui = async (body: Api.TroLyLoiDan): Promise<void> => veLoiDan(await api<Api.TroLyLoiDanResponse>("/api/tro-ly/loi-dan", { method: "POST", body }), true);
  const form = h(
    "form",
    { class: "tl-cd-form" },
    h("label", null, "Câu chào", chao),
    h("label", null, "Giọng trả lời", giong),
    h("label", null, "Lời dặn thêm", dan),
    h("label", null, `Câu hỏi mẫu (mỗi dòng một câu, tối đa ${G.soCauMau})`, mau),
    h("p", { class: "muted" }, "Không gõ số điện thoại, email, số tiền. Luật cốt lõi của trợ lý (từ chối bí mật, tiền, thông tin khách) luôn đứng trước lời dặn này."),
    luu,
    bao.el,
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void bam(luu, bao, () =>
      gui({ cauChao: chao.value, giong: giong.value, loiDanThem: dan.value, cauHoiMau: mau.value.split("\n").map((x) => x.trim()).filter(Boolean) }),
    );
  });
  const lichSu = h(
    "details",
    { class: "tl-cd-ban" },
    h("summary", null, `Lịch sử bản (${d.cacBan.length})`),
    h(
      "ol",
      { class: "tl-cd-ds" },
      ...d.cacBan.map((b, i) => {
        const nut = h("button", { class: "btn", type: "button" }, "Quay lại bản này");
        const baoBan = dongBao();
        nut.addEventListener("click", () => void bam(nut, baoBan, () => gui({ cauChao: b.cauChao, giong: b.giong, loiDanThem: b.loiDanThem, cauHoiMau: b.cauHoiMau })));
        return h(
          "li",
          { class: "tl-cd-ban-dong" },
          h("p", { class: "muted" }, `${dateTime(b.luc)} · ${b.nguoi ?? "Hệ thống"}${i === 0 ? " · đang dùng" : ""}`),
          h("p", { class: "tl-chu" }, b.cauChao),
          b.giong ? h("p", { class: "tl-chu" }, `Giọng: ${b.giong}`) : null,
          b.loiDanThem ? h("p", { class: "tl-chu" }, `Lời dặn: ${b.loiDanThem}`) : null,
          b.cauHoiMau.length ? h("p", { class: "tl-chu" }, `Câu mẫu: ${b.cauHoiMau.join(" · ")}`) : null,
          i === 0 ? null : nut,
          baoBan.el,
        );
      }),
    ),
  );
  if (daLuu) bao.ok("Đã lưu thành bản mới.");
  replaceChildren(byId("tl-loi-dan"), h("h2", { id: "tl-loi-dan-h" }, "Lời dặn"), form, lichSu);
}

// ---- 4. Ngữ cảnh bổ sung ---------------------------------------------------------------------------------------------------------------------------------

function veNguCanh(d: Api.TroLyNguCanhResponse, daLuu = false): void {
  const tieuDe = oChu({ id: "tl-nc-tieu-de", maxlength: G.tieuDeNguCanh, placeholder: "Ví dụ: Giờ làm việc văn phòng" });
  const noiDung = oVung({ id: "tl-nc-noi-dung", maxlength: G.noiDungNguCanh, rows: 4 });
  const them = h("button", { class: "btn btn-primary", type: "submit" }, "Thêm đoạn");
  const huy = h("button", { class: "btn", type: "button", hidden: true }, "Huỷ sửa");
  const bao = dongBao();
  let dangSua: Api.TroLyNguCanhResponse["doan"][number] | null = null;
  const form = h(
    "form",
    { class: "tl-cd-form" },
    h("label", null, "Tiêu đề đoạn", tieuDe),
    h("label", null, "Nội dung", noiDung),
    h("div", { class: "tl-cd-hang" }, them, huy),
    bao.el,
  );
  const boSua = (): void => {
    dangSua = null;
    tieuDe.value = "";
    noiDung.value = "";
    them.textContent = "Thêm đoạn";
    huy.hidden = true;
  };
  huy.addEventListener("click", boSua);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void bam(them, bao, async () => {
      const body: Api.TroLyNguCanhRequest = { tieuDe: tieuDe.value, noiDung: noiDung.value, bat: dangSua ? dangSua.bat : true };
      const r = dangSua
        ? await api<Api.TroLyNguCanhResponse>(`/api/tro-ly/ngu-canh/${dangSua.doanId}`, { method: "PUT", body })
        : await api<Api.TroLyNguCanhResponse>("/api/tro-ly/ngu-canh", { method: "POST", body });
      veNguCanh(r, true);
    });
  });
  const ds = d.doan.length
    ? h(
      "ul",
      { class: "tl-cd-ds" },
      ...d.doan.map((x) => {
        const bat = h("input", { type: "checkbox", checked: x.bat });
        const baoDoan = dongBao();
        bat.addEventListener("change", () => {
          bat.disabled = true;
          api<Api.TroLyNguCanhResponse>(`/api/tro-ly/ngu-canh/${x.doanId}`, { method: "PUT", body: { tieuDe: x.tieuDe, noiDung: x.noiDung, bat: bat.checked } })
            .then((r) => veNguCanh(r))
            .catch((err) => { bat.checked = !bat.checked; bat.disabled = false; baoDoan.loi(loiCua(err)); });
        });
        const sua = h("button", { class: "btn", type: "button" }, "Sửa");
        sua.addEventListener("click", () => {
          dangSua = x;
          tieuDe.value = x.tieuDe;
          noiDung.value = x.noiDung;
          them.textContent = "Lưu thành bản mới";
          huy.hidden = false;
          tieuDe.focus();
        });
        return h(
          "li",
          { class: "tl-cd-ban-dong" },
          h("h3", { class: "tl-cd-tieu-de" }, x.tieuDe),
          h("p", { class: "tl-chu" }, x.noiDung),
          h("div", { class: "tl-cd-hang" }, h("label", { class: "tl-cd-bat" }, bat, "Đang dùng"), sua),
          baoDoan.el,
        );
      }),
    )
    : h("p", { class: "muted" }, "Chưa có đoạn nào.");
  if (daLuu) bao.ok("Đã lưu.");
  replaceChildren(
    byId("tl-ngu-canh"),
    h("h2", { id: "tl-ngu-canh-h" }, "Ngữ cảnh bổ sung"),
    h("p", { class: "muted" }, "Đoạn đang dùng được trợ lý đọc như một mục hướng dẫn. Không gõ số điện thoại, email, số tiền."),
    ds,
    form,
  );
}

// ---- 5. Lịch sử hỏi đáp ----------------------------------------------------------------------------------------------------------------------------------

function veLichSu(): void {
  const tu = h("input", { type: "date", id: "tl-ls-tu" });
  const den = h("input", { type: "date", id: "tl-ls-den" });
  const nguoi = h("select", { id: "tl-ls-nguoi" }, h("option", { value: "" }, "Mọi người"));
  const vai = h("select", { id: "tl-ls-vai" }, h("option", { value: "" }, "Mọi vai"), ...PERMISSION_CODES.map((p) => h("option", { value: p }, PERMISSION_LABEL[p])));
  const q = h("input", { type: "search", id: "tl-ls-q", maxlength: 100, placeholder: "Tìm trong câu hỏi, câu trả lời" });
  const loc = h("button", { class: "btn btn-primary", type: "submit" }, "Lọc");
  const ds = h("ol", { class: "tl-cd-ds tl-ls-ds", "aria-live": "polite" });
  const truoc = h("button", { class: "btn", type: "button" }, "Trang trước");
  const sau = h("button", { class: "btn", type: "button" }, "Trang sau");
  const bao = dongBao();
  let trangSo = 1;
  let napNguoi = false;
  const nap = async (): Promise<void> => {
    bao.xoa();
    const sp = new URLSearchParams();
    if (tu.value) sp.set("tu", tu.value);
    if (den.value) sp.set("den", den.value);
    if (nguoi.value) sp.set("nguoi", nguoi.value);
    if (vai.value) sp.set("vai", vai.value);
    if (q.value.trim()) sp.set("q", q.value.trim());
    sp.set("trang", String(trangSo));
    try {
      const r = await api<Api.TroLyLichSuResponse>(`/api/tro-ly/lich-su?${sp}`);
      if (!napNguoi) {
        napNguoi = true;
        nguoi.append(...r.nguoi.map((n) => h("option", { value: n.staffId }, n.ten)));
      }
      replaceChildren(
        ds,
        ...(r.dong.length
          ? r.dong.map((d) =>
            h(
              "li",
              { class: "tl-cd-ban-dong" },
              h("p", { class: "muted" }, `${dateTime(d.luc)} · ${d.nguoi} · ${d.vai.join(", ")} · ${d.ketQua} · ${usd(d.chiPhiUsd)}`),
              h("p", { class: "tl-chu" }, h("strong", null, "Hỏi: "), d.cauHoi),
              h("p", { class: "tl-chu" }, h("strong", null, "Đáp: "), d.traLoi),
              d.nguon.length ? h("p", { class: "tl-nguon" }, `Nguồn: ${d.nguon.join("; ")}`) : null,
            ))
          : [h("li", { class: "muted" }, "Không có câu hỏi nào khớp.")]),
      );
      truoc.disabled = trangSo <= 1;
      sau.disabled = !r.coThem;
    } catch (e) {
      bao.loi(loiCua(e));
    }
  };
  const form = h(
    "form",
    { class: "tl-cd-loc" },
    h("label", null, "Từ ngày", tu),
    h("label", null, "Đến ngày", den),
    h("label", null, "Người hỏi", nguoi),
    h("label", null, "Vai", vai),
    h("label", { class: "tl-cd-loc-tim" }, "Tìm chữ", q),
    loc,
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    trangSo = 1;
    void nap();
  });
  truoc.addEventListener("click", () => { trangSo = Math.max(1, trangSo - 1); void nap(); });
  sau.addEventListener("click", () => { trangSo += 1; void nap(); });
  replaceChildren(
    byId("tl-lich-su"),
    h("h2", { id: "tl-lich-su-h" }, "Lịch sử hỏi đáp"),
    h("p", { class: "muted" }, "Số điện thoại, email, số giấy tờ trong câu hỏi đã được che trước khi lưu. Lịch sử không xoá được."),
    form,
    bao.el,
    ds,
    h("div", { class: "tl-cd-hang" }, truoc, sau),
  );
  void nap();
}

// ---- nạp --------------------------------------------------------------------------------------------------------------------------------------------------

if (!can(staff, "settings.ops")) {
  showError(errorEl, "Chỉ người phụ trách hệ thống (Toàn quyền) mở được trang này.");
} else {
  try {
    const [c, ld, nc] = await Promise.all([
      api<Api.TroLyCaiDatResponse>("/api/tro-ly/cai-dat"),
      api<Api.TroLyLoiDanResponse>("/api/tro-ly/loi-dan"),
      api<Api.TroLyNguCanhResponse>("/api/tro-ly/ngu-canh"),
    ]);
    caiDat = c;
    veTinhTrang();
    veAiDung();
    veLoiDan(ld);
    veNguCanh(nc);
    veLichSu();
    trang.hidden = false;
  } catch (e) {
    showError(errorEl, loiCua(e));
  }
}
