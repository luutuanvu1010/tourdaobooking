import React from "react";
import { Nut } from "../../hanh-dong/nut/Nut.jsx";

function NutChan({ cap, d }) {
  if (!d) return null;
  const { nhan, ...con } = d;
  return <Nut cap={d.cap || cap} {...con}>{nhan}</Nut>;
}

export function BangTruot({ mo = true, tieuDe, moTa, chinh, phu, onDong, trongKhung, nhanDong = "Đóng", children, className = "" }) {
  const id = React.useId();
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!mo) return undefined;
    const phim = (e) => { if (e.key === "Escape" && onDong) onDong(); };
    document.addEventListener("keydown", phim);
    if (!trongKhung && ref.current) ref.current.focus();
    return () => document.removeEventListener("keydown", phim);
  }, [mo, onDong, trongKhung]);
  if (!mo) return null;
  return (
    <div className={"ib-lop" + (trongKhung ? " ib-lop--trong-khung" : "") + " " + className}>
      <div className="ib-lop__man" onClick={onDong} aria-hidden="true" />
      <div ref={ref} tabIndex={-1} className="ib-bang-truot" role="dialog" aria-modal="true" aria-labelledby={id + "-td"} aria-describedby={moTa ? id + "-mt" : undefined}>
        <span className="ib-bang-truot__tay" aria-hidden="true" />
        <div className="ib-bang-truot__dau">
          <div className="ib-bang-truot__dau-chu">
            <h2 id={id + "-td"} className="ib-bang-truot__tieu-de">{tieuDe}</h2>
            {moTa ? <p id={id + "-mt"} className="ib-bang-truot__mo-ta">{moTa}</p> : null}
          </div>
          {onDong ? <Nut cap="loi-nho" bieuTuong="close" nhan={nhanDong} className="ib-bang-truot__dong" onClick={onDong} /> : null}
        </div>
        {children ? <div className="ib-bang-truot__than">{children}</div> : null}
        {chinh || phu ? (
          <div className="ib-bang-truot__chan">
            <NutChan cap="phu" d={phu} />
            <NutChan cap="chinh" d={chinh} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
