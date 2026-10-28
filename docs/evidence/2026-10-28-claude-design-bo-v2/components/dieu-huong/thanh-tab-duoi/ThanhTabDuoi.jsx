import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";

export function ThanhTabDuoi({ muc = [], chon, onChon, className = "" }) {
  return (
    <nav className={"ib-thanh-tab " + className} aria-label="Điều hướng chính">
      {muc.map((m) => {
        const dangChon = m.id === chon;
        return (
          <a key={m.id} href={m.href || "#"} className={"ib-thanh-tab__muc" + (dangChon ? " is-chon" : "")} aria-current={dangChon ? "page" : undefined} onClick={(e) => { if (onChon) { e.preventDefault(); onChon(m.id); } }}>
            <span className="ib-thanh-tab__vien">
              <BieuTuong ten={m.bieuTuong} co={24} />
              {m.dem ? <span className="ib-thanh-tab__dem" aria-label={m.dem + " mục mới"}>{m.dem > 99 ? "99+" : m.dem}</span> : null}
            </span>
            <span className="ib-thanh-tab__nhan">{m.nhan}</span>
          </a>
        );
      })}
    </nav>
  );
}
