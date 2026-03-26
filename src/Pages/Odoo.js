import { useEffect } from 'react';

/** Set in `.env`: REACT_APP_ODOO_SHOP_URL=https://your-instance.odoo.com/shop */
const ODOO_SHOP_URL =
  process.env.REACT_APP_ODOO_SHOP_URL;

function Odoo() {
  useEffect(() => {
    document.title = 'Shop — Odoo';
  }, []);

  return (
    <div
      className="flex flex-col bg-gray-100"
      style={{ fontFamily: 'Calibri, Verdana, sans-serif', minHeight: 'calc(100vh - 120px)' }}
    >
      <div className="max-w-[1600px] mx-auto w-full px-3 py-3 flex flex-col flex-1 min-h-0">
        <iframe
          title="Odoo shop"
          src={ODOO_SHOP_URL}
          className="w-full flex-1 min-h-[70vh] rounded-lg border border-gray-200 shadow-sm bg-white"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}

export default Odoo;
