import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";

const CHAN_MAC_DINH = [
  { id: "cua-toi", nhan: "Của tôi", bieuTuong: "me" },
  { id: "ho-tro", nhan: "Hỗ trợ", bieuTuong: "handset" },
  { id: "huong-dan", nhan: "Hướng dẫn", bieuTuong: "help" },
];

function Muc({ m, chon, onChon }) {
  const dangChon = m.id === chon;
  return (
    <li>
      <a href={m.href || "#"} className={"ib-thanh-ben__muc" + (dangChon ? " is-chon" : "") + (m.xem ? " " + m.xem : "")} aria-current={dangChon ? "page" : undefined} onClick={(e) => { if (onChon) { e.preventDefault(); onChon(m.id); } }}>
        {m.bieuTuong ? <BieuTuong ten={m.bieuTuong} /> : <span className="ib-thanh-ben__thut" />}
        <span className="ib-thanh-ben__nhan">{m.nhan}</span>
        {m.dem ? <span className="ib-thanh-ben__dem">{m.dem}</span> : null}
      </a>
    </li>
  );
}

export function ThanhBen({ nhom = [], chon, onChon, moSan, chan = CHAN_MAC_DINH, nguoi, className = "" }) {
  const [mo, datMo] = React.useState(() => new Set(moSan || nhom.filter((n) => n.muc.some((m) => m.id === chon)).map((n) => n.id)));
  const doi = (id) => datMo((s) => { const t = new Set(s); t.has(id) ? t.delete(id) : t.add(id); return t; });
  return (
    <nav className={"ib-thanh-ben " + className} aria-label="Điều hướng">
      <div className="ib-thanh-ben__cuon">
        {nhom.map((n) => n.nhan ? (
          <div key={n.id} className="ib-thanh-ben__nhom">
            <button type="button" className="ib-thanh-ben__dau-nhom" aria-expanded={mo.has(n.id) ? "true" : "false"} onClick={() => doi(n.id)}>
              <span>{n.nhan}</span>
              {!mo.has(n.id) && n.muc.some((m) => m.id === chon) ? <span className="ib-thanh-ben__cham" aria-label="Có mục đang mở" role="img" /> : null}
              <BieuTuong ten="chevron-down" co={18} className={"ib-thanh-ben__mui" + (mo.has(n.id) ? " is-mo" : "")} />
            </button>
            {mo.has(n.id) ? <ul className="ib-thanh-ben__ds">{n.muc.map((m) => <Muc key={m.id} m={m} chon={chon} onChon={onChon} />)}</ul> : null}
          </div>
        ) : (
          <ul key={n.id} className="ib-thanh-ben__ds">{n.muc.map((m) => <Muc key={m.id} m={m} chon={chon} onChon={onChon} />)}</ul>
        ))}
      </div>
      <div className="ib-thanh-ben__chan">
        <ul className="ib-thanh-ben__ds">{chan.map((m) => <Muc key={m.id} m={m} chon={chon} onChon={onChon} />)}</ul>
        {nguoi ? (
          <div className="ib-thanh-ben__nguoi">
            <span className="ib-thanh-ben__chu-tat" aria-hidden="true">{nguoi.chuTat}</span>
            <span className="ib-thanh-ben__ten"><span>{nguoi.ten}</span><span className="ib-thanh-ben__vai">{nguoi.vaiTro}</span></span>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
