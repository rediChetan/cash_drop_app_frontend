import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';

function CashDropValidation() {
  const [data, setData] = useState([]);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [showOnlyUnreconciled, setShowOnlyUnreconciled] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [adminCounts, setAdminCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [statusMessages, setStatusMessages] = useState({});

  const COLORS = {
    magenta: '#AA056C',
    yellowGreen: '#C4CB07',
    lightPink: '#F46690',
    gray: '#64748B'
  };

  const showStatusMessage = (itemId, text, type = 'info') => {
    setStatusMessages(prev => ({ ...prev, [itemId]: { text, type, show: true } }));
    setTimeout(() => {
      setStatusMessages(prev => {
        const updated = { ...prev };
        if (updated[itemId]) {
          updated[itemId].show = false;
        }
        return updated;
      });
    }, 5000);
  };

  const fetchData = async () => {
    setLoading(true);
    const token = sessionStorage.getItem('access_token');
    try {
      const response = await fetch(
        `${API_ENDPOINTS.CASH_DROP_RECONCILER}?datefrom=${dateFrom}&dateto=${dateTo}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const result = await response.json();
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        showStatusMessage('global', 'Cannot connect to server. Please make sure the backend is running on http://localhost:8000', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showOnlyUnreconciled]);

  const handleReconcile = async (item) => {
    const count = adminCounts[item.id];
    
    if (!count || count === '') {
      showStatusMessage(item.id, 'Please enter a counted amount', 'error');
      return;
    }

    const countedAmount = parseFloat(count);
    const cashDropAmount = parseFloat(item.system_drop_amount);
    const reconcileDelta = countedAmount - cashDropAmount;

    const response = await fetch(API_ENDPOINTS.CASH_DROP_RECONCILER, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ 
        id: item.id, 
        admin_count_amount: countedAmount,
        reconcile_delta: reconcileDelta,
        is_reconciled: true
      })
    });

    if (response.ok) {
      showStatusMessage(item.id, 'Record reconciled successfully', 'success');
      fetchData();
    } else {
      const err = await response.json();
      showStatusMessage(item.id, err.error || 'Failed to reconcile', 'error');
    }
  };

  const handleUnreconcile = async (item) => {
    if (!window.confirm('Are you sure you want to unreconcile this record? This will allow you to edit the counted amount again.')) {
      return;
    }

    const response = await fetch(API_ENDPOINTS.CASH_DROP_RECONCILER, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
      },
      body: JSON.stringify({ 
        id: item.id, 
        is_reconciled: false
      })
    });

    if (response.ok) {
      showStatusMessage(item.id, 'Record unreconciled successfully', 'success');
      // Clear the admin count for this item so user can enter a new value
      setAdminCounts(prev => {
        const updated = { ...prev };
        delete updated[item.id];
        return updated;
      });
      fetchData();
    } else {
      const err = await response.json();
      showStatusMessage(item.id, err.error || 'Failed to unreconcile', 'error');
    }
  };

  const handleQuickFilter = (type) => {
    const now = new Date();
    let start = new Date();
    if (type === 'WTD') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
    } else if (type === 'MTD') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    setDateFrom(start.toISOString().slice(0, 10));
    setDateTo(new Date().toISOString().slice(0, 10));
  };

  const filteredList = showOnlyUnreconciled ? data.filter(d => !d.is_reconciled) : data;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8" style={{ fontFamily: 'Calibri, Verdana, sans-serif', fontSize: '12px', color: COLORS.gray }}>
      <div className="max-w-[1400px] mx-auto bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        
        {/* HEADER & FILTERS */}
        <div className="p-6 border-b bg-white">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h2 className="font-black uppercase italic tracking-tighter" style={{ fontSize: '24px' }}>Validation <span style={{ color: COLORS.magenta }}>Terminal</span></h2>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.gray }}>Audit & Reconciliation</p>
            </div>

            <div className="flex flex-wrap items-end gap-4 bg-gray-50 p-4 rounded-lg border">
              {/* Custom Date Inputs */}
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase mb-1" style={{ color: COLORS.gray }}>From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-xs p-2 border rounded bg-white" style={{ fontSize: '12px' }} />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase mb-1" style={{ color: COLORS.gray }}>To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-xs p-2 border rounded bg-white" style={{ fontSize: '12px' }} />
              </div>
              
              <button onClick={fetchData} className="text-white px-4 py-2 rounded text-xs font-bold transition" style={{ backgroundColor: COLORS.magenta, fontSize: '12px' }}>Fetch</button>

              <div className="flex gap-1 border-l pl-4">
                <button onClick={() => handleQuickFilter('WTD')} className="px-3 py-2 bg-white border rounded text-[10px] font-black hover:bg-gray-50" style={{ fontSize: '12px' }}>WTD</button>
                <button onClick={() => handleQuickFilter('MTD')} className="px-3 py-2 bg-white border rounded text-[10px] font-black hover:bg-gray-50" style={{ fontSize: '12px' }}>MTD</button>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-3 border-l pl-4">
                 <span className={`text-[10px] font-black uppercase ${!showOnlyUnreconciled ? 'text-pink-600' : 'text-gray-300'}`} style={{ fontSize: '12px' }}>All</span>
                 <button 
                  onClick={() => setShowOnlyUnreconciled(!showOnlyUnreconciled)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${showOnlyUnreconciled ? 'bg-pink-600' : 'bg-gray-300'}`}
                  style={{ backgroundColor: showOnlyUnreconciled ? COLORS.magenta : undefined }}
                 >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showOnlyUnreconciled ? 'left-7' : 'left-1'}`} />
                 </button>
                 <span className={`text-[10px] font-black uppercase ${showOnlyUnreconciled ? 'text-pink-600' : 'text-gray-300'}`} style={{ fontSize: '12px', color: showOnlyUnreconciled ? COLORS.magenta : undefined }}>Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Status Message */}
        {statusMessages.global && statusMessages.global.show && (
          <div className={`mx-6 mt-4 p-3 rounded-lg border-l-4 ${
            statusMessages.global.type === 'error' ? 'bg-red-50 border-red-500' : 
            statusMessages.global.type === 'success' ? 'bg-green-50 border-green-500' : 
            'bg-blue-50 border-blue-500'
          }`}>
            <p className={`font-bold ${statusMessages.global.type === 'error' ? 'text-red-700' : statusMessages.global.type === 'success' ? 'text-green-700' : 'text-blue-700'}`} style={{ fontSize: '12px' }}>
              {statusMessages.global.text}
            </p>
          </div>
        )}

        {/* DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black uppercase border-b" style={{ color: COLORS.gray }}>
                <th className="p-4" style={{ fontSize: '12px' }}>Date / Register</th>
                <th className="p-4" style={{ fontSize: '12px' }}>Cash Drop</th>
                <th className="p-4" style={{ fontSize: '12px' }}>Cash Drop Receipt Amount</th>
                <th className="p-4" style={{ fontSize: '12px' }}>Variance</th>
                <th className="p-4" style={{ fontSize: '12px' }}>Counted Amount</th>
                <th className="p-4" style={{ fontSize: '12px' }}>Reconcile Delta</th>
                <th className="p-4" style={{ fontSize: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length > 0 ? filteredList.map(item => {
                const countedAmount = parseFloat(adminCounts[item.id] || 0);
                const cashDropAmount = parseFloat(item.system_drop_amount || 0);
                const reconcileDelta = countedAmount - cashDropAmount;
                
                // Safely parse reconcile_delta from item
                const itemReconcileDelta = item.reconcile_delta != null ? parseFloat(item.reconcile_delta) : 0;
                const displayReconcileDelta = isNaN(itemReconcileDelta) ? 0 : itemReconcileDelta;
                
                return (
                  <tr key={item.id} className="border-b hover:bg-pink-50/30 transition-colors">
                    <td className="p-4">
                      <div className="text-xs font-black" style={{ fontSize: '12px' }}>{item.date}</div>
                      <div className="text-[10px] font-bold uppercase" style={{ color: COLORS.magenta, fontSize: '12px' }}>{item.workstation} | {item.user_name}</div>
                    </td>
                    <td className="p-4">
                      {item.label_image_url ? (
                        <button 
                          onClick={() => setSelectedImage(item.label_image_url)}
                          className="text-sm font-black border-b-2 border-dotted hover:text-pink-600 transition-colors"
                          style={{ fontSize: '12px', color: COLORS.gray, borderColor: COLORS.lightPink }}
                        >
                          ${item.system_drop_amount}
                        </button>
                      ) : (
                        <span className="text-sm font-black" style={{ fontSize: '12px', color: COLORS.gray }}>${item.system_drop_amount}</span>
                      )}
                      {item.label_image_url && (
                        <div className="text-[9px] uppercase mt-1" style={{ color: COLORS.gray }}>Click to view receipt</div>
                      )}
                    </td>
                    <td className="p-4 text-sm font-bold" style={{ fontSize: '12px', color: COLORS.gray }}>${item.ws_label_amount}</td>
                    <td className={`p-4 text-sm font-black ${parseFloat(item.variance) !== 0 ? 'text-red-500' : 'text-gray-300'}`} style={{ fontSize: '12px' }}>
                      ${item.variance}
                    </td>
                    <td className="p-4">
                      {item.is_reconciled ? (
                        <span className="text-sm font-black" style={{ fontSize: '12px', color: COLORS.yellowGreen }}>${item.admin_count_amount}</span>
                      ) : (
                        <div className="flex items-center bg-white border rounded px-2 py-1 w-32 focus-within:ring-2 ring-pink-500">
                          <span className="mr-1" style={{ color: COLORS.gray }}>$</span>
                          <input 
                            type="number"
                            step="0.01"
                            className="w-full font-bold outline-none"
                            style={{ fontSize: '12px' }}
                            onChange={(e) => setAdminCounts({...adminCounts, [item.id]: e.target.value})}
                            value={adminCounts[item.id] || ''}
                          />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {item.is_reconciled ? (
                        <span className={`text-sm font-black ${displayReconcileDelta !== 0 ? 'text-orange-600' : 'text-gray-400'}`} style={{ fontSize: '12px' }}>
                          ${displayReconcileDelta.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-sm font-black" style={{ fontSize: '12px', color: reconcileDelta !== 0 ? COLORS.lightPink : COLORS.gray }}>
                          ${isNaN(reconcileDelta) ? '0.00' : reconcileDelta.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {item.is_reconciled ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1" style={{ color: COLORS.yellowGreen }}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span className="text-[10px] font-black uppercase" style={{ fontSize: '12px' }}>Reconciled</span>
                          </div>
                          <button 
                            onClick={() => handleUnreconcile(item)}
                            className="text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-md transition-all active:scale-95"
                            style={{ backgroundColor: COLORS.gray, fontSize: '11px' }}
                          >
                            UNRECONCILE
                          </button>
                          {statusMessages[item.id] && statusMessages[item.id].show && (
                            <div className={`text-[9px] p-2 rounded ${
                              statusMessages[item.id].type === 'error' ? 'bg-red-50 text-red-700' : 
                              statusMessages[item.id].type === 'success' ? 'bg-green-50 text-green-700' : 
                              'bg-blue-50 text-blue-700'
                            }`} style={{ fontSize: '11px' }}>
                              {statusMessages[item.id].text}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => handleReconcile(item)}
                            className="text-white text-[10px] font-black px-4 py-2 rounded-lg shadow-md transition-all active:scale-95"
                            style={{ backgroundColor: COLORS.magenta, fontSize: '12px' }}
                          >
                            RECONCILE
                          </button>
                          {statusMessages[item.id] && statusMessages[item.id].show && (
                            <div className={`text-[9px] p-2 rounded ${
                              statusMessages[item.id].type === 'error' ? 'bg-red-50 text-red-700' : 
                              statusMessages[item.id].type === 'success' ? 'bg-green-50 text-green-700' : 
                              'bg-blue-50 text-blue-700'
                            }`} style={{ fontSize: '11px' }}>
                              {statusMessages[item.id].text}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="7" className="p-20 text-center italic font-bold uppercase tracking-widest" style={{ color: COLORS.gray, fontSize: '12px' }}>
                    {loading ? "Loading Records..." : "No records found for this period"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FOR IMAGE */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="relative max-w-4xl w-full bg-white rounded-lg p-2 overflow-hidden shadow-2xl">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-red-600 text-white w-8 h-8 rounded-full font-bold flex items-center justify-center hover:bg-red-700 z-10"
            >
              ✕
            </button>
            <div className="max-h-[80vh] overflow-y-auto">
              <img 
                src={selectedImage || ''} 
                alt="Cash Drop Receipt" 
                className="w-full h-auto"
                onError={(e) => console.error("Image failed to load:", e.target.src)}
              />
            </div>
            <div className="p-4 bg-gray-50 text-center">
              <p className="text-xs font-black uppercase tracking-tighter" style={{ color: COLORS.gray, fontSize: '12px' }}>Verified Cash Drop Receipt</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashDropValidation;
