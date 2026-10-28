import React from "react";
import { Nut } from "../../hanh-dong/nut/Nut.jsx";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";

function trangHien(trang, tong) {
  if (tong <= 7) return Array.from({ length: tong }, (_, i) => i + 1);
  const s = new Set([1, tong, trang - 1, trang, trang + 1]);
  const ds = [...s].filter((n) => n >= 1 && n <= tong).sort((a, b) => a - b);
  const kq = [];
  ds.forEach((n, i) => { if (i && n - ds[i - 1] > 1) kq.push("…" + n); kq.push(n); });
  return kq;
}

export function PhanTrang({ kieu = "tai-them", daHien = 0, tong = 0, donVi = "đơn", dangTai, onTaiThem, trang = 1, coTrang = 20, onTrang, className = "" }) {
  if (kieu === "so-trang") {
    const tongTrang = Math.max(1, Math.ceil(tong / coTrang));
    const tu = tong ? (trang - 1) * coTrang + 1 : 0;
    const den = Math.min(tong, trang * coTrang);
    return (
      <nav className={"ib-phan-trang " + className} aria-label="Phân trang">
        <span className="ib-phan-trang__dem">{tu}–{den} / {tong} {donVi}</span>
        <div className="ib-phan-trang__so">
          <Nut cap="loi-nho" bieuTuong="back" nhan="Trang trước" tat={trang <= 1} onClick={() => onTrang && onTrang(trang - 1)} />
          {trangHien(trang, tongTrang).map((n) => typeof n === "string"
            ? <span key={n} className="ib-phan-trang__cach" aria-hidden="true">…</span>
            : <button key={n} type="button" className={"ib-phan-trang__nut" + (n === trang ? " is-chon" : "")} aria-current={n === trang ? "page" : undefined} aria-label={"Trang " + n} onClick={() => onTrang && onTrang(n)}>{n}</button>)}
          <Nut cap="loi-nho" bieuTuong="next" nhan="Trang sau" tat={trang >= tongTrang} onClick={() => onTrang && onTrang(trang + 1)} />
        </div>
      </nav>
    );
  }
  const het = daHien >= tong;
  return (
    <div className={"ib-tai-them " + className}>
      <span className="ib-phan-trang__dem" aria-live="polite">Đang hiện {daHien} / {tong} {donVi}</span>
      {het ? <span className="ib-tai-them__het"><BieuTuong ten="check" co={16} />Đã hiện hết</span> : <Nut cap="phu" rong dangTai={dangTai} onClick={onTaiThem}>{dangTai ? "Đang tải…" : "Tải thêm"}</Nut>}
    </div>
  );
}
