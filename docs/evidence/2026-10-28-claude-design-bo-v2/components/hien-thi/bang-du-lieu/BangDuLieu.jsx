import React from "react";
import { KhungXuong } from "../khung-xuong/KhungXuong.jsx";

export function BangDuLieu({ cot = [], dong = [], khoa = "id", hanhDong, nhanHanhDong = "Thao tác", theBaDong, dangTai, soDongXuong = 4, rong, caoToiDa, nhan, xemRe, className = "" }) {
  const so = cot.length + (hanhDong ? 1 : 0);
  const xuong = Array.from({ length: soDongXuong }, (_, i) => i);
  let than;
  if (dangTai) {
    than = xuong.map((i) => (
      <tr key={"x" + i}>{cot.map((c) => <td key={c.khoa} className={c.can === "phai" ? "is-phai" : ""}><KhungXuong kieu="dong" soDong={1} rong={c.can === "phai" ? "70%" : "80%"} /></td>)}{hanhDong ? <td /> : null}</tr>
    ));
  } else if (!dong.length) {
    than = <tr><td colSpan={so} className="ib-bang__rong">{rong}</td></tr>;
  } else {
    than = dong.map((d, i) => (
      <tr key={d[khoa] ?? i} className={xemRe === i ? "ib-xem-re" : ""}>
        {cot.map((c) => <td key={c.khoa} className={(c.can === "phai" ? "is-phai" : "") + (c.gon ? " is-gon" : "")}>{c.hien ? c.hien(d) : d[c.khoa]}</td>)}
        {hanhDong ? <td className="ib-bang__hd">{hanhDong(d)}</td> : null}
      </tr>
    ));
  }
  return (
    <div className={"ib-bang " + className}>
      <div className="ib-bang__cuon" style={caoToiDa ? { maxHeight: caoToiDa } : undefined}>
        <table className="ib-bang__bang" aria-label={nhan} aria-busy={dangTai ? "true" : undefined}>
          <thead><tr>{cot.map((c) => <th key={c.khoa} scope="col" className={c.can === "phai" ? "is-phai" : ""} style={c.rong ? { width: c.rong } : undefined}>{c.nhan}</th>)}{hanhDong ? <th scope="col" className="ib-bang__hd"><span className="ib-an">{nhanHanhDong}</span></th> : null}</tr></thead>
          <tbody>{than}</tbody>
        </table>
      </div>
      <div className="ib-bang__the" aria-label={nhan} aria-busy={dangTai ? "true" : undefined}>
        {dangTai ? xuong.map((i) => <div key={i} className="ib-bang__muc"><KhungXuong kieu="dong" soDong={3} /></div>)
          : !dong.length ? <div className="ib-bang__rong">{rong}</div>
          : dong.map((d, i) => {
            const t = theBaDong ? theBaDong(d) : { dong1: d[cot[0]?.khoa] };
            return (
              <div key={d[khoa] ?? i} className="ib-bang__muc">
                <div className="ib-bang__d1"><span className="ib-bang__d1-chu">{t.dong1}</span>{t.sau1 ? <span>{t.sau1}</span> : null}</div>
                {t.dong2 ? <div className="ib-bang__d2">{t.dong2}</div> : null}
                {t.dong3 || hanhDong ? <div className="ib-bang__d3"><span>{t.dong3}</span>{hanhDong ? <span className="ib-bang__d3-hd">{hanhDong(d)}</span> : null}</div> : null}
              </div>
            );
          })}
      </div>
    </div>
  );
}
