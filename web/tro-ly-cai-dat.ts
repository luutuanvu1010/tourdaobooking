// Trang "Trợ lý Hỗ trợ" (/tro-ly-cai-dat — ADR-0069): bảng điều khiển trợ lý AI của Toàn quyền (ô settings.ops; máy chủ kiểm lại ở MỌI route).
// Sáu phần: Tình trạng (bật / tắt, key đã đặt + 4 ký tự cuối, Thử key, chi phí, lượt thử), Ai được dùng (9 công tắc + trần ngày), Bộ não (ADR-0073: mẫu,
// mức suy nghĩ, độ dài, token ra, lời nhắc, lịch sử bản, ô thử), Lời dặn (câu chào, câu hỏi mẫu), Ngữ cảnh bổ sung, Lịch sử hỏi đáp (lọc ngày / người / vai,
// tìm chữ). Không innerHTML; chữ người dùng hiện bằng textContent. Ước tính giá lấy từ src/shared/tro-ly-mau.ts (không import gì).
// Không import src/shared/tro-ly.ts (kéo cả kho tri thức vào bundle): giới hạn độ dài lấy từ tệp riêng tro-ly-gioi-han.ts; câu lỗi lời thường do máy chủ soạn.
import { GIOI_HAN_TRO_LY as G } from "../src/shared/tro-ly-gioi-han";
import { uocMotCauMicroUsd } from "../src/shared/tro-ly-mau";
import { PERMISSION_CODES, PERMISSION_LABEL, can, type PermissionCode } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { chuInDam } from "./tro-ly-in-dam";
import { dateTime } from "./format";
import { initShell, showError } from "./shell";

const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";
const loiCua = (e: unknown): string => (e instanceof ApiError ? e.message : LOI_MANG);
const usd = (n: number): string => `${n.toLocaleString("vi-VN", { maximumFractionDigits: 4 })} USD`;
/** Số tiền rất nhỏ (giá một câu ~ 0,0008 USD): tới 6 chữ số lẻ. */
const usdNho = (n: number): string => `${n.toLocaleString("vi-VN", { maximumFractionDigits: 6 })} USD`;
/** ADR-0082 H1: nhãn tiếng Việt của một đoạn đã dùng ở ô thử. */
const nhanKhop = (d: Api.TroLyDoanDaChon): string => [d.theoNghia ? "khớp nghĩa" : "", d.theoTuKhoa ? "khớp từ khoá" : ""].filter(Boolean).join(", ");
const ngayVn = (iso: string): string => iso.split("-").reverse().join("/");

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
    h("p", { class: "muted" }, "Đổi key làm trên Cloudflare, không nhập trong Nền tảng."),
    h("div", { class: "tl-cd-hang" }, thu),
    baoThu.el,
    h("p", null, `Tháng ${thang}/${nam}: đã dùng ${usd(s.chiPhiThangUsd)} trên trần ${usd(s.tranThangUsd)} · ${s.soCauThang} câu. Hôm nay: ${s.soCauHomNay} câu.`),
    h("p", { id: "tl-luot-thu" }, `Lượt thử tháng này: ${s.soLuotThuThang} lượt thử (Thử key và ô thử) — tiền tháng ở trên đã gồm cả lượt thử.`),
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
    h("p", { class: "muted" }, "Tài khoản có nhiều vai được dùng khi ít nhất một vai đang bật. Vai tắt không thấy nút Trợ lý."),
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

// ---- 3. Bộ não (ADR-0073 Đ1, Đ2, Đ5) ---------------------------------------------------------------------------------------------------------------------

const CANH_BAO =
  "Xoá các luật an toàn trong lời nhắc có thể khiến trợ lý trả lời điều không nên nói. Che số điện thoại, ẩn số tiền, giới hạn tiền và quyền xem vẫn do máy chủ giữ.";

// Mục Bộ não = phần cấu hình (dựng lại sau mỗi lần lưu) + ô thử (dựng MỘT lần, giữ câu hỏi và kết quả thử qua các lần lưu).
const vungCauHinh = h("div", { class: "tl-cd-form" });
let layCauHinh: () => Api.TroLyBoNao;
let dsMau: Api.TroLyMauDto[] = [];
/** Đang chạy một việc của mục Bộ não (Lưu, Khôi phục, Quay lại bản, Thử) ⇒ mọi nút của mục bị khoá, kể cả nút dựng ra giữa chừng. */
let boNaoBan = false;
const nutBoNao = (): HTMLButtonElement[] => Array.from(byId("tl-bo-nao").querySelectorAll("button"));

async function bamBoNao(bao: ReturnType<typeof dongBao>, viec: () => Promise<string | void>): Promise<void> {
  if (boNaoBan) return;
  bao.xoa();
  boNaoBan = true;
  for (const b of nutBoNao()) b.disabled = true;
  try {
    const s = await viec();
    if (s) bao.ok(s);
  } catch (e) {
    bao.loi(loiCua(e));
  } finally {
    boNaoBan = false;
    for (const b of nutBoNao()) b.disabled = false;
  }
}

function veBoNao(d: Api.TroLyBoNaoResponse, daLuu = false): void {
  const hh = d.hienHanh;
  dsMau = d.danhSachMau;
  const mauMat = !d.danhSachMau.some((m) => m.ma === hh.mau);
  const mau = h("select", { id: "tl-mau" }, ...d.danhSachMau.map((m) => h("option", { value: m.ma }, m.ten)));
  mau.value = hh.mau;
  if (mauMat) mau.selectedIndex = -1;
  const baoMauMat = h("p", { class: "tl-cd-loi", id: "tl-mau-mat", hidden: !mauMat }, "Mẫu đã lưu không còn trong danh sách — chọn mẫu khác rồi Lưu.");
  const muc = h("select", { id: "tl-muc" });
  const doDai = h("select", { id: "tl-do-dai" }, ...d.doDai.map((x) => h("option", { value: x.ma }, x.nhan)));
  doDai.value = hh.doDai;
  const goiYCao = h("p", { class: "muted", id: "tl-token-goi-y", hidden: true }, `Mức Cao cần ít nhất ${G.tokenRaKhiCao.toLocaleString("vi-VN")} token trả lời.`);
  const token = h("input", {
    type: "number", id: "tl-token-ra", min: G.tokenRaThap, max: G.tokenRaCao, step: 100, value: String(hh.tokenRaToiDa), inputmode: "numeric", "aria-describedby": "tl-token-goi-y",
  });
  const gia = h("p", { class: "muted", id: "tl-gia" });
  const loiNhac = oVung({ id: "tl-loi-nhac", rows: 14, maxlength: G.loiNhac, value: hh.loiNhac, "aria-describedby": "tl-dem" });
  const dem = h("p", { class: "muted", id: "tl-dem" });
  const mauChon = (): Api.TroLyMauDto | null => d.danhSachMau.find((m) => m.ma === mau.value) ?? null;
  const motCau = (ma: string): string => usdNho(uocMotCauMicroUsd(ma, Number(token.value) || hh.tokenRaToiDa) / 1_000_000);
  // Mức Cao cần token ra ≥ tokenRaKhiCao (máy chủ cũng chặn): nâng min và hiện gợi ý, KHÔNG tự đổi số người dùng đã gõ.
  const veGoiYCao = (): void => {
    const cao = muc.value === "high";
    goiYCao.hidden = !cao;
    token.min = String(cao ? G.tokenRaKhiCao : G.tokenRaThap);
  };
  const veMuc = (giu: string): void => {
    const m = mauChon() ?? d.danhSachMau[0]!;
    replaceChildren(muc, ...m.mucSuyNghi.map((x) => h("option", { value: x.ma }, x.nhan)));
    muc.value = m.mucSuyNghi.some((x) => x.ma === giu) ? giu : m.mucSuyNghi[0]!.ma;
    veGoiYCao();
  };
  // Đặc tả §5 "ô chọn mẫu (tên + giá ước tính)": chữ của từng lựa chọn kèm giá một câu, tính lại khi đổi số token trả lời.
  const veGia = (): void => {
    for (const o of Array.from(mau.options)) {
      const m = d.danhSachMau.find((x) => x.ma === o.value);
      if (m) o.textContent = `${m.ten} — khoảng ${motCau(m.ma)} một câu`;
    }
    const m = mauChon();
    gia.textContent = m
      ? `${m.ten}: vào ${usdNho(m.gia.vao / 1_000_000)}, ra ${usdNho(m.gia.ra / 1_000_000)} cho mỗi 1 triệu token (giá tra ngày ${ngayVn(m.ngayTraGia)}). Một câu khoảng ${motCau(m.ma)}. ${d.ghiChuUocTinh}`
      : "";
  };
  const veDem = (): void => {
    const v = loiNhac.value;
    dem.textContent = `${v.length.toLocaleString("vi-VN")} / ${G.loiNhac.toLocaleString("vi-VN")} ký tự · ${v === d.loiNhacMacDinh ? "giống" : "khác"} bản mặc định${v === hh.loiNhac ? "" : " · chưa lưu"}`;
  };
  veMuc(hh.mucSuyNghi);
  veGia();
  veDem();
  mau.addEventListener("change", () => { baoMauMat.hidden = !!mauChon(); veMuc(muc.value); veGia(); });
  muc.addEventListener("change", veGoiYCao);
  token.addEventListener("input", veGia);
  loiNhac.addEventListener("input", veDem);
  layCauHinh = () => ({ mau: mau.value, mucSuyNghi: muc.value, doDai: doDai.value, tokenRaToiDa: Number(token.value), loiNhac: loiNhac.value });

  const luu = h("button", { class: "btn btn-primary", type: "submit" }, "Lưu bộ não");
  const khoiPhuc = h("button", { class: "btn", type: "button" }, "Khôi phục mặc định");
  const bao = dongBao();
  const gui = async (body: Api.TroLyBoNao): Promise<void> => veBoNao(await api<Api.TroLyBoNaoResponse>("/api/tro-ly/bo-nao", { method: "PUT", body }), true);
  // Khôi phục chỉ đưa bản mặc định vào Ô LỜI NHẮC (không lưu, không đụng mẫu / mức / độ dài); người dùng bấm "Lưu bộ não" để dùng.
  khoiPhuc.addEventListener("click", () => {
    if (boNaoBan) return;
    if (loiNhac.value !== hh.loiNhac && !confirm("Lời nhắc trong ô đang có chỗ sửa chưa lưu. Thay bằng bản mặc định?")) return;
    loiNhac.value = d.loiNhacMacDinh;
    veDem();
    bao.ok("Đã đưa bản mặc định vào ô lời nhắc — bấm “Lưu bộ não” để dùng.");
  });

  const dsBan = h("ol", { class: "tl-cd-ds" });
  const lichSuBan = h("details", { class: "tl-cd-ban" }, h("summary", null, "Lịch sử bản"), dsBan);
  lichSuBan.addEventListener("toggle", () => {
    if (!lichSuBan.open) return;
    api<Api.TroLyBoNaoLichSuResponse>("/api/tro-ly/bo-nao/lich-su")
      .then((r) => {
        const tenMau = (ma: string): string => d.danhSachMau.find((m) => m.ma === ma)?.ten ?? "Mẫu không còn trong danh sách";
        replaceChildren(
          dsBan,
          ...(r.cacBan.length
            ? r.cacBan.map((b, i) => {
              const nut = h("button", { class: "btn", type: "button", disabled: boNaoBan }, "Quay lại bản này");
              const baoBan = dongBao();
              nut.addEventListener("click", () => void bamBoNao(baoBan, () => gui({ mau: b.mau, mucSuyNghi: b.mucSuyNghi, doDai: b.doDai, tokenRaToiDa: b.tokenRaToiDa, loiNhac: b.loiNhac })));
              return h(
                "li",
                { class: "tl-cd-ban-dong" },
                h("p", { class: "muted" }, `${dateTime(b.luc)} · ${b.nguoi ?? "Hệ thống"} · đổi: ${b.phanDoi}${i === 0 ? " · đang dùng" : ""}`),
                h("p", { class: "tl-chu" }, `${tenMau(b.mau)} · ${b.tokenRaToiDa} token trả lời · lời nhắc ${b.loiNhac.length.toLocaleString("vi-VN")} ký tự`),
                i === 0 ? null : nut,
                baoBan.el,
              );
            })
            : [h("li", { class: "muted" }, "Chưa lưu bản nào — đang dùng bản mặc định.")]),
        );
      })
      .catch((e) => replaceChildren(dsBan, h("li", { class: "tl-cd-loi" }, loiCua(e))));
  });

  const form = h(
    "form",
    { class: "tl-cd-form" },
    h("label", null, "Mẫu AI", mau),
    baoMauMat,
    gia,
    h("label", null, "Mức suy nghĩ", muc),
    h("label", null, "Độ dài trả lời", doDai),
    h("label", null, `Số token trả lời tối đa (${G.tokenRaThap}–${G.tokenRaCao})`, token),
    goiYCao,
    h("label", null, "Lời nhắc (trợ lý đọc trước mọi câu hỏi)", loiNhac),
    dem,
    h("p", { class: "alert warn", role: "note" }, CANH_BAO),
    h("div", { class: "tl-cd-hang" }, luu, khoiPhuc),
    bao.el,
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void bamBoNao(bao, () => gui(layCauHinh()));
  });

  if (daLuu) bao.ok("Đã lưu thành bản mới.");
  // Cờ của máy chủ: macDinh = chưa có bản nào (lời nhắc = mặc định + giọng / lời dặn cũ nếu có — B5) HOẶC chữ đúng bằng bản mặc định HIỆN TẠI. Bản "Khôi phục
  // mặc định" lưu thành chữ, nên khi bản mặc định đổi ở lần phát hành sau thì cờ thành "đã sửa" — câu dưới nói rõ là so với bản mặc định hiện tại.
  const kemCu = d.macDinh && hh.loiNhac !== d.loiNhacMacDinh;
  replaceChildren(
    vungCauHinh,
    h(
      "p",
      { class: "muted", id: "tl-mac-dinh" },
      d.macDinh
        ? `Đang dùng lời nhắc mặc định.${kemCu ? " Cuối lời nhắc có kèm giọng / lời dặn thêm của mục Lời dặn cũ." : ""}`
        : "Đang dùng lời nhắc đã sửa (khác bản mặc định hiện tại).",
    ),
    form,
    h("details", { class: "tl-cd-ban" }, h("summary", null, "Xem bản mặc định"), h("p", { class: "tl-chu" }, d.loiNhacMacDinh)),
    lichSuBan,
  );
}

/** Dựng khung mục Bộ não + ô thử MỘT lần (ADR-0073 Đ5): cấu hình ĐANG SOẠN (chưa lưu) + vai giả định; lượt thử tính vào trần tiền tháng. */
function dungBoNao(): void {
  const vaiThu = h("select", { id: "tl-thu-vai" }, ...PERMISSION_CODES.map((p) => h("option", { value: p }, PERMISSION_LABEL[p])));
  const cauThu = oVung({ id: "tl-thu-cau", rows: 2, maxlength: 500, placeholder: "Gõ câu hỏi để thử" });
  const nutThu = h("button", { class: "btn", type: "button" }, "Thử với cấu hình đang soạn");
  const ketQua = h("div", { id: "tl-thu-kq", "aria-live": "polite" });
  const baoThu = dongBao();
  nutThu.addEventListener("click", () =>
    void bamBoNao(baoThu, async () => {
      replaceChildren(ketQua, h("p", { class: "muted" }, "Đang thử…"));
      try {
        const r = await api<Api.TroLyThuResponse>("/api/tro-ly/thu", {
          method: "POST",
          body: { boNao: layCauHinh(), cauHoi: cauThu.value, vai: vaiThu.value as PermissionCode } satisfies Api.TroLyThuRequest,
        });
        const tenMau = dsMau.find((m) => m.ma === r.mau)?.ten ?? "Mẫu không còn trong danh sách";
        replaceChildren(
          ketQua,
          h("p", { class: "tl-chu" }, ...chuInDam(r.traLoi)),
          r.nguon.length ? h("p", { class: "tl-nguon" }, `Nguồn: ${r.nguon.join("; ")}`) : null,
          h(
            "div",
            { id: "tl-thu-doan" },
            h("p", { class: "muted" }, r.doanDaChon.length ? "Đoạn đã dùng:" : "Đoạn đã dùng: không có đoạn nào — trợ lý trả lời không kèm đoạn hướng dẫn."),
            r.doanDaChon.length ? h("ul", { class: "tl-cd-ds" }, ...r.doanDaChon.map((d) => h("li", null, `${d.ten} — ${nhanKhop(d)}`))) : null,
          ),
          h(
            "p",
            { class: "muted" },
            `${tenMau} · ${r.tokenVao} token vào, ${r.tokenRa} token ra · ${usdNho(r.chiPhiUsd)} trả lời + ${usdNho(r.chiPhiVanNghiaMicroUsd / 1_000_000)} tìm theo nghĩa (tính vào trần tháng)`,
          ),
        );
      } catch (e) {
        replaceChildren(ketQua);
        throw e;
      } finally {
        // Lượt thử lỗi vẫn có thể đã tính tiền (mẫu đã chạy) ⇒ luôn đọc lại Tình trạng; lỗi đọc lại không che lỗi của lượt thử.
        try {
          caiDat = await api<Api.TroLyCaiDatResponse>("/api/tro-ly/cai-dat");
          veTinhTrang();
        } catch { /* giữ số cũ tới lần nạp sau */ }
      }
    }),
  );
  replaceChildren(
    byId("tl-bo-nao"),
    h("h2", { id: "tl-bo-nao-h" }, "Bộ não"),
    vungCauHinh,
    h("h3", { class: "tl-cd-tieu-de" }, "Thử trước khi lưu"),
    h("p", { class: "muted" }, "Chạy câu hỏi với cấu hình đang soạn ở trên (chưa cần lưu). Lượt thử tính vào trần tiền tháng, không tính vào số câu mỗi ngày."),
    h("label", null, "Vai giả định", vaiThu),
    h("label", null, "Câu hỏi thử", cauThu),
    h("div", { class: "tl-cd-hang" }, nutThu),
    baoThu.el,
    ketQua,
  );
}

// ---- 4. Lời dặn ------------------------------------------------------------------------------------------------------------------------------------------

function veLoiDan(d: Api.TroLyLoiDanResponse, daLuu = false): void {
  const hh = d.hienHanh;
  const chao = oVung({ id: "tl-cau-chao", maxlength: G.cauChao, rows: 2, value: hh.cauChao });
  const mau = oVung({ id: "tl-cau-mau", rows: 4, value: hh.cauHoiMau.join("\n"), placeholder: "Mỗi dòng một câu hỏi" });
  const luu = h("button", { class: "btn btn-primary", type: "submit" }, "Lưu thành bản mới");
  const bao = dongBao();
  const gui = async (body: Api.TroLyLoiDan): Promise<void> => veLoiDan(await api<Api.TroLyLoiDanResponse>("/api/tro-ly/loi-dan", { method: "POST", body }), true);
  const form = h(
    "form",
    { class: "tl-cd-form" },
    h("label", null, "Câu chào", chao),
    h("label", null, `Câu hỏi mẫu (mỗi dòng một câu, tối đa ${G.soCauMau})`, mau),
    // ADR-0084 Đ5: chỗ thay {ten} — khung chat thay bằng cách gọi của người đang mở (vd "anh Vũ"; chưa ghi giới tính ⇒ "bạn").
    h("p", { class: "muted", id: "tl-cau-chao-goi-y" }, "Gõ {ten} vào câu chào để chèn cách gọi người dùng, ví dụ “anh Vũ”, “chị Lan” (hồ sơ chưa ghi giới tính: “bạn”); gõ {xung} để chèn cách Mai tự xưng: “em”, hoặc “mình” khi gọi “bạn”."),
    h("p", { class: "muted" }, "Không gõ số điện thoại, email, số tiền. Cách trợ lý trả lời nằm ở mục Bộ não."),
    luu,
    bao.el,
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void bam(luu, bao, () =>
      gui({ cauChao: chao.value, giong: hh.giong, loiDanThem: hh.loiDanThem, cauHoiMau: mau.value.split("\n").map((x) => x.trim()).filter(Boolean) }),
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

// ---- 5. Ngữ cảnh bổ sung ---------------------------------------------------------------------------------------------------------------------------------

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

// ---- 6. Lịch sử hỏi đáp ----------------------------------------------------------------------------------------------------------------------------------

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
              h("p", { class: "tl-chu" }, h("strong", null, "Đáp: "), ...chuInDam(d.traLoi)),
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
    const [c, bn, ld, nc] = await Promise.all([
      api<Api.TroLyCaiDatResponse>("/api/tro-ly/cai-dat"),
      api<Api.TroLyBoNaoResponse>("/api/tro-ly/bo-nao"),
      api<Api.TroLyLoiDanResponse>("/api/tro-ly/loi-dan"),
      api<Api.TroLyNguCanhResponse>("/api/tro-ly/ngu-canh"),
    ]);
    caiDat = c;
    veTinhTrang();
    veAiDung();
    dungBoNao();
    veBoNao(bn);
    veLoiDan(ld);
    veNguCanh(nc);
    veLichSu();
    trang.hidden = false;
  } catch (e) {
    showError(errorEl, loiCua(e));
  }
}
