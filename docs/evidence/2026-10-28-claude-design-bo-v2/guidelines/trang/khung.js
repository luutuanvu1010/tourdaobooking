// Trình bày trang riêng của từng thành phần + hai bảng tổng quan. Chạy qua Babel (type="text/babel").
(() => {
const DS = window.IslandBookingSystemDesignSystemV2_449f87;
window.IB_DEMO = window.IB_DEMO || {};
const IB_GOC = window.IB_GOC || "../../..";
window.IB_LOGO = IB_GOC + "/assets/logo-96.png";

function Khung({ kho, cao, nen, children }) {
  return (
    <figure className="tr-khung">
      <figcaption>{kho === 390 ? "390 · điện thoại" : "1040 · máy tính"}</figcaption>
      <div className={"ib-goc ib-khung tr-man" + (nen === "phu" ? " tr-man--phu" : "")} style={{ width: kho, height: cao }}>{children}</div>
    </figure>
  );
}

function DsChu({ ds }) {
  return <ul>{ds.map((x, i) => <li key={i} dangerouslySetInnerHTML={{ __html: x }} />)}</ul>;
}

function TrangThanhPhan({ so }) {
  const d = window.IB_DEMO[so];
  if (!d) return <p style={{ padding: 32 }}>Chưa có trang {so}</p>;
  const Demo = d.Demo;
  return (
    <div className="tr-trang">
      <div className="tr-dau">
        <span className="tr-so">{so}</span>
        <div><h1 className="tr-ten">{d.ten}</h1></div>
        <p className="tr-mo">{d.mo}</p>
        <span className="tr-nhom">{d.thanhPhan}</span>
      </div>
      <div className="tr-luoi">
        <div className="tr-o"><h3>Khi nào dùng</h3><DsChu ds={d.dung} /></div>
        <div className="tr-o"><h3>Khi nào không</h3><DsChu ds={d.khong} /></div>
        <div className="tr-o"><h3>Trạng thái và biến thể</h3><DsChu ds={d.trangThai} /></div>
        <div className="tr-o"><h3>Người dùng truyền gì vào</h3>
          <table className="tr-bang"><tbody>{d.truyen.map((r, i) => <tr key={i}><td><code>{r[0]}</code></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table>
        </div>
      </div>
      <div className="tr-kho">
        <span><b>Ở 768:</b> {d.kho768}</span>
        <span><b>Ở 1440:</b> {d.kho1440}</span>
        {d.token ? <span><b>Token:</b> <span dangerouslySetInnerHTML={{ __html: d.token }} /></span> : null}
      </div>
      <div className="tr-khung-hang">
        <Khung kho={390} cao={d.cao390} nen={d.nen}><Demo kho={390} /></Khung>
        <Khung kho={1040} cao={d.cao1040} nen={d.nen}><Demo kho={1040} /></Khung>
      </div>
    </div>
  );
}

function TongQuan({ kho }) {
  const ds = Object.keys(window.IB_DEMO).sort();
  const cot = kho === 390 ? 4 : 2;
  return (
    <div className="tq-trang" style={{ width: cot * kho + (cot - 1) * 32 + 80 }}>
      <div className="tq-dau">
        <h1>{kho === 390 ? "Bảng A · Mọi thành phần ở 390" : "Bảng B · Mọi thành phần ở 1040"}</h1>
        <p>{kho === 390 ? "Khổ điện thoại 390×844, dùng một tay. Đánh số theo mục 10 của đề bài; 00 là Biểu tượng (thêm)." : "Khổ máy tính 1040. Cùng thành phần, cùng số thứ tự với Bảng A."}</p>
      </div>
      <div className="tq-luoi" style={{ gridTemplateColumns: `repeat(${cot}, ${kho}px)` }}>
        {ds.map((so) => {
          const d = window.IB_DEMO[so];
          const Demo = d.Demo;
          return (
            <section key={so} className="tq-muc">
              <h2><span>{so}</span>{d.ten}</h2>
              <div className={"ib-goc ib-khung tr-man" + (d.nen === "phu" ? " tr-man--phu" : "")} style={{ width: kho, height: kho === 390 ? d.cao390 : d.cao1040 }}><Demo kho={kho} /></div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

window.IBTrang = {
  hienTrang(so) { ReactDOM.createRoot(document.getElementById("root")).render(<TrangThanhPhan so={so} />); },
  hienTongQuan(kho) { ReactDOM.createRoot(document.getElementById("root")).render(<TongQuan kho={kho} />); },
};
Object.assign(window, { Khung });
})();
