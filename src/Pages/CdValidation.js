import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { getPSTDate, getPSTWeekStart, getPSTMonthStart, formatPSTDate } from '../utils/dateUtils';

function CashDropValidation() {
  const [data, setData] = useState([]);
  const [dateFrom, setDateFrom] = useState(getPSTDate());
  const [dateTo, setDateTo] = useState(getPSTDate());
  const [showOnlyUnreconciled, setShowOnlyUnreconciled] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [adminCounts, setAdminCounts] = useState({});
  const [reconciliationNotes, setReconciliationNotes] = useState({});
  const [showNotesField, setShowNotesField] = useState({});
  const [loading, setLoading] = useState(false);
  const [statusMessages, setStatusMessages] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  const [unreconcileModal, setUnreconcileModal] = useState({ show: false, item: null });

  // Set page title
  useEffect(() => {
    document.title = 'Validation Terminal';
  }, []);
  
  const DENOMINATION_CONFIG = [
    { name: 'hundreds', value: 100, display: 'Hundreds ($100)' },
    { name: 'fifties', value: 50, display: 'Fifties ($50)' },
    { name: 'twenties', value: 20, display: 'Twenties ($20)' },
    { name: 'tens', value: 10, display: 'Tens ($10)' },
    { name: 'fives', value: 5, display: 'Fives ($5)' },
    { name: 'twos', value: 2, display: 'Twos ($2)' },
    { name: 'ones', value: 1, display: 'Ones ($1)' },
    { name: 'half_dollars', value: 0.50, display: 'Half Dollars ($0.50)' },
    { name: 'quarters', value: 0.25, display: 'Quarters ($0.25)' },
    { name: 'dimes', value: 0.10, display: 'Dimes ($0.10)' },
    { name: 'nickels', value: 0.05, display: 'Nickels ($0.05)' },
    { name: 'pennies', value: 0.01, display: 'Pennies ($0.01)' },
  ];
  
  const toggleRow = (itemId) => {
    setExpandedRows(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

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
      // Initialize adminCounts for existing items if they have an admin_count_amount
      const initialAdminCounts = {};
      result.forEach(item => {
        if (item.admin_count_amount != null) {
          initialAdminCounts[item.id] = item.admin_count_amount;
        }
      });
      setAdminCounts(initialAdminCounts);
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

  const handleReconcile = async (item, withDelta = false) => {
    const count = adminCounts[item.id];
    
    if (!count || count === '') {
      showStatusMessage(item.id, 'Please enter a counted amount', 'error');
      return;
    }

    const countedAmount = parseFloat(count);
    const cashDropAmount = parseFloat(item.system_drop_amount);
    const reconcileDelta = countedAmount - cashDropAmount;

    // For regular reconcile, amounts must match
    if (!withDelta && Math.abs(reconcileDelta) > 0.01) {
      showStatusMessage(item.id, 'Counted amount must match drop amount for reconciliation. Use "Reconcile with Delta" if amounts differ.', 'error');
      return;
    }

    // For reconcile with delta, show notes field if not already shown
    if (withDelta && !showNotesField[item.id]) {
      setShowNotesField(prev => ({ ...prev, [item.id]: true }));
      return;
    }

    // If notes field is shown but notes are required for delta reconciliation
    if (withDelta && showNotesField[item.id] && (!reconciliationNotes[item.id] || reconciliationNotes[item.id].trim() === '')) {
      showStatusMessage(item.id, 'Please add notes explaining the delta before reconciling', 'error');
      return;
    }

    const requestBody = { 
      id: item.id, 
      admin_count_amount: countedAmount,
      reconcile_delta: reconcileDelta,
      is_reconciled: true
    };

    // Add notes if reconciling with delta
    if (withDelta && reconciliationNotes[item.id]) {
      requestBody.notes = reconciliationNotes[item.id];
    }

    const response = await fetch(API_ENDPOINTS.CASH_DROP_RECONCILER, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      showStatusMessage(item.id, 'Record reconciled successfully', 'success');
      // Clear notes field state
      setShowNotesField(prev => {
        const updated = { ...prev };
        delete updated[item.id];
        return updated;
      });
      setReconciliationNotes(prev => {
        const updated = { ...prev };
        delete updated[item.id];
        return updated;
      });
      fetchData();
    } else {
      const err = await response.json();
      showStatusMessage(item.id, err.error || 'Failed to reconcile', 'error');
    }
  };

  const handleUnreconcileClick = (item) => {
    setUnreconcileModal({ show: true, item });
  };

  const handleUnreconcileConfirm = async () => {
    if (!unreconcileModal.item) return;

    const item = unreconcileModal.item;
    setUnreconcileModal({ show: false, item: null });

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
      // Clear the admin count and notes for this item so user can enter a new value
      setAdminCounts(prev => {
        const updated = { ...prev };
        delete updated[item.id];
        return updated;
      });
      setReconciliationNotes(prev => {
        const updated = { ...prev };
        delete updated[item.id];
        return updated;
      });
      setShowNotesField(prev => {
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
    let start;
    if (type === 'WTD') {
      start = getPSTWeekStart();
    } else if (type === 'MTD') {
      start = getPSTMonthStart();
    } else {
      start = getPSTDate();
    }
    setDateFrom(start);
    setDateTo(getPSTDate());
    fetchData(start, getPSTDate());
  };

  const filteredList = showOnlyUnreconciled ? data.filter(d => !d.is_reconciled) : data;

  return (
    <div className="min-h-screen bg-gray-100 p-2 md:p-4" style={{ fontFamily: 'Calibri, Verdana, sans-serif', fontSize: '14px', color: COLORS.gray }}>
      <div className="max-w-[1400px] mx-auto bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        
        {/* HEADER & FILTERS */}
        <div className="p-4 md:p-6 border-b bg-white">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6">
            <div>
              <h2 className="font-black uppercase italic tracking-tighter" style={{ fontSize: '24px' }}>Validation <span style={{ color: COLORS.magenta }}>Terminal</span></h2>
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: COLORS.gray, fontSize: '14px' }}>Audit & Reconciliation</p>
            </div>

            <div className="flex flex-wrap items-end gap-2 md:gap-4 bg-gray-50 p-3 md:p-4 rounded-lg border w-full lg:w-auto">
              {/* Custom Date Inputs */}
              <div className="flex flex-col">
                <label className="text-xs font-black uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="p-2 border rounded bg-white" style={{ fontSize: '14px' }} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-black uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="p-2 border rounded bg-white" style={{ fontSize: '14px' }} />
              </div>
              
              <button onClick={fetchData} className="text-white px-3 md:px-4 py-2 rounded font-bold transition" style={{ backgroundColor: COLORS.magenta, fontSize: '14px' }}>Fetch</button>

              <div className="flex gap-1 border-l pl-2 md:pl-4">
                <button onClick={() => handleQuickFilter('WTD')} className="px-2 md:px-3 py-2 bg-white border rounded font-black hover:bg-gray-50" style={{ fontSize: '14px' }}>WTD</button>
                <button onClick={() => handleQuickFilter('MTD')} className="px-2 md:px-3 py-2 bg-white border rounded font-black hover:bg-gray-50" style={{ fontSize: '14px' }}>MTD</button>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-2 md:gap-3 border-l pl-2 md:pl-4">
                 <span className={`text-xs font-black uppercase ${!showOnlyUnreconciled ? 'text-pink-600' : 'text-gray-300'}`} style={{ fontSize: '14px' }}>All</span>
                 <button 
                  onClick={() => setShowOnlyUnreconciled(!showOnlyUnreconciled)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${showOnlyUnreconciled ? 'bg-pink-600' : 'bg-gray-300'}`}
                  style={{ backgroundColor: showOnlyUnreconciled ? COLORS.magenta : undefined }}
                 >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showOnlyUnreconciled ? 'left-7' : 'left-1'}`} />
                 </button>
                 <span className={`text-xs font-black uppercase ${showOnlyUnreconciled ? 'text-pink-600' : 'text-gray-300'}`} style={{ fontSize: '14px', color: showOnlyUnreconciled ? COLORS.magenta : undefined }}>Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Status Message */}
        {statusMessages.global && statusMessages.global.show && (
          <div className={`mx-4 md:mx-6 mt-4 p-3 rounded-lg border-l-4 ${
            statusMessages.global.type === 'error' ? 'bg-red-50 border-red-500' : 
            statusMessages.global.type === 'success' ? 'bg-green-50 border-green-500' : 
            'bg-blue-50 border-blue-500'
          }`}>
            <p className={`font-bold ${statusMessages.global.type === 'error' ? 'text-red-700' : statusMessages.global.type === 'success' ? 'text-green-700' : 'text-blue-700'}`} style={{ fontSize: '14px' }}>
              {statusMessages.global.text}
            </p>
          </div>
        )}

        {/* DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 font-black uppercase border-b" style={{ color: COLORS.gray }}>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Date / Register</th>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Cash Drop</th>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Cash Drop Receipt Amount</th>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Variance</th>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Counted Amount</th>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Reconcile Delta</th>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Action</th>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}></th>
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
                const isExpanded = expandedRows[item.id];
                
                return (
                  <React.Fragment key={item.id}>
                    <tr className="border-b hover:bg-pink-50/30 transition-colors">
                      <td className="p-2 md:p-4">
                        <div className="font-black" style={{ fontSize: '14px' }}>{formatPSTDate(item.date)}</div>
                        <div className="font-bold uppercase" style={{ color: COLORS.magenta, fontSize: '14px' }}>{item.workstation} | {item.user_name}</div>
                      </td>
                      <td className="p-2 md:p-4">
                        {item.label_image_url ? (
                          <button 
                            onClick={() => setSelectedImage(item.label_image_url)}
                            className="font-black border-b-2 border-dotted hover:text-pink-600 transition-colors"
                            style={{ fontSize: '14px', color: COLORS.gray, borderColor: COLORS.lightPink }}
                          >
                            ${item.system_drop_amount}
                          </button>
                        ) : (
                          <span className="font-black" style={{ fontSize: '14px', color: COLORS.gray }}>${item.system_drop_amount}</span>
                        )}
                        {item.label_image_url && (
                          <div className="uppercase mt-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Click to view receipt</div>
                        )}
                      </td>
                      <td className="p-2 md:p-4 font-bold" style={{ fontSize: '14px', color: COLORS.gray }}>${item.ws_label_amount}</td>
                      <td className={`p-2 md:p-4 font-black ${parseFloat(item.variance) !== 0 ? 'text-red-500' : 'text-gray-300'}`} style={{ fontSize: '14px' }}>
                        ${item.variance}
                      </td>
                      <td className="p-2 md:p-4">
                        {item.is_reconciled ? (
                          <span className="font-black" style={{ fontSize: '14px', color: COLORS.yellowGreen }}>${item.admin_count_amount}</span>
                        ) : (
                          <div className="flex items-center bg-white border rounded px-2 py-1 w-24 md:w-32 focus-within:ring-2 ring-pink-500">
                            <span className="mr-1" style={{ color: COLORS.gray }}>$</span>
                            <input 
                              type="text"
                              className="w-full font-bold outline-none"
                              style={{ fontSize: '14px' }}
                              onChange={(e) => setAdminCounts({...adminCounts, [item.id]: e.target.value})}
                              value={adminCounts[item.id] || ''}
                            />
                          </div>
                        )}
                      </td>
                      <td className="p-2 md:p-4">
                        {item.is_reconciled ? (
                          <span className={`font-black ${displayReconcileDelta !== 0 ? 'text-orange-600' : 'text-gray-400'}`} style={{ fontSize: '14px' }}>
                            ${displayReconcileDelta.toFixed(2)}
                          </span>
                        ) : (
                          <span className="font-black" style={{ fontSize: '14px', color: reconcileDelta !== 0 ? COLORS.lightPink : COLORS.gray }}>
                            ${isNaN(reconcileDelta) ? '0.00' : reconcileDelta.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="p-2 md:p-4">
                        {item.is_reconciled ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1" style={{ color: COLORS.yellowGreen }}>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                              <span className="font-black uppercase" style={{ fontSize: '14px' }}>Reconciled</span>
                            </div>
                            {item.reconciliation_notes && (
                              <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                <p className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Notes:</p>
                                <p className="text-xs italic" style={{ color: COLORS.gray, fontSize: '14px' }}>{item.reconciliation_notes}</p>
                              </div>
                            )}
                            <button 
                              onClick={() => handleUnreconcileClick(item)}
                              className="text-white font-black px-2 md:px-3 py-1.5 rounded-lg shadow-md transition-all active:scale-95"
                              style={{ backgroundColor: COLORS.gray, fontSize: '14px' }}
                            >
                              UNRECONCILE
                            </button>
                            {statusMessages[item.id] && statusMessages[item.id].show && (
                              <div className={`p-2 rounded ${
                                statusMessages[item.id].type === 'error' ? 'bg-red-50 text-red-700' : 
                                statusMessages[item.id].type === 'success' ? 'bg-green-50 text-green-700' : 
                                'bg-blue-50 text-blue-700'
                              }`} style={{ fontSize: '14px' }}>
                                {statusMessages[item.id].text}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {/* Notes field - shown when "Reconcile with Delta" is clicked */}
                            {showNotesField[item.id] && (
                              <div className="p-2 bg-gray-50 rounded border border-gray-200">
                                <label className="block text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>
                                  Notes (Required for Delta Reconciliation):
                                </label>
                                <textarea
                                  value={reconciliationNotes[item.id] || ''}
                                  onChange={(e) => setReconciliationNotes({...reconciliationNotes, [item.id]: e.target.value})}
                                  rows="3"
                                  className="w-full p-2 border rounded-lg resize-none focus:ring-2 focus:ring-pink-500 outline-none"
                                  placeholder="Explain the difference between counted amount and drop amount..."
                                  style={{ fontSize: '14px' }}
                                />
                              </div>
                            )}
                            
                            {/* Two reconcile buttons */}
                            <div className="flex flex-col gap-2">
                              <button 
                                onClick={() => handleReconcile(item, false)}
                                disabled={Math.abs(reconcileDelta) > 0.01}
                                className="text-white font-black px-3 md:px-4 py-2 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: COLORS.magenta, fontSize: '14px' }}
                                title={Math.abs(reconcileDelta) > 0.01 ? 'Counted amount must match drop amount' : 'Reconcile when amounts match'}
                              >
                                RECONCILE
                              </button>
                              <button 
                                onClick={() => handleReconcile(item, true)}
                                className="text-white font-black px-3 md:px-4 py-2 rounded-lg shadow-md transition-all active:scale-95"
                                style={{ backgroundColor: COLORS.yellowGreen, fontSize: '14px' }}
                              >
                                RECONCILE WITH DELTA
                              </button>
                            </div>
                            
                            {statusMessages[item.id] && statusMessages[item.id].show && (
                              <div className={`p-2 rounded ${
                                statusMessages[item.id].type === 'error' ? 'bg-red-50 text-red-700' : 
                                statusMessages[item.id].type === 'success' ? 'bg-green-50 text-green-700' : 
                                'bg-blue-50 text-blue-700'
                              }`} style={{ fontSize: '14px' }}>
                                {statusMessages[item.id].text}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-2 md:p-4">
                        <button
                          onClick={() => toggleRow(item.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                          style={{ color: COLORS.gray }}
                        >
                          {isExpanded ? '−' : '+'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan="8" className="p-4 md:p-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            {/* Denominations */}
                            <div className="bg-white border rounded-lg p-4">
                              <h4 className="font-black uppercase mb-3 tracking-widest border-b pb-2" style={{ fontSize: '18px', color: COLORS.gray }}>Denominations</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {DENOMINATION_CONFIG.map(denom => {
                                  const value = item[denom.name] || 0;
                                  return (
                                    <div key={denom.name} className="flex justify-between text-xs bg-gray-50 p-2 rounded border">
                                      <span style={{ color: COLORS.gray, fontSize: '14px' }}>{denom.display}</span>
                                      <span className="font-bold" style={{ fontSize: '14px' }}>{value}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Image */}
                            {item.label_image_url && (
                              <div className="bg-white border rounded-lg p-4">
                                <h4 className="font-black uppercase mb-3 tracking-widest border-b pb-2" style={{ fontSize: '18px', color: COLORS.gray }}>Receipt Image</h4>
                                <div className="cursor-pointer" onClick={() => setSelectedImage(item.label_image_url)}>
                                  <img 
                                    src={item.label_image_url} 
                                    alt="Cash Drop Receipt" 
                                    className="w-full h-auto rounded border border-gray-200 hover:opacity-80 transition-opacity"
                                  />
                                  <p className="text-center mt-2 italic" style={{ fontSize: '14px', color: COLORS.gray }}>Click to view full size</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Notes */}
                            {item.notes && (
                              <div className="bg-white border rounded-lg p-4">
                                <h4 className="font-black uppercase mb-3 tracking-widest border-b pb-2" style={{ fontSize: '18px', color: COLORS.gray }}>Notes/Comments</h4>
                                <p className="italic" style={{ fontSize: '14px', color: COLORS.gray }}>{item.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td colSpan="8" className="p-20 text-center italic font-bold uppercase tracking-widest" style={{ color: COLORS.gray, fontSize: '14px' }}>
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
              <p className="font-black uppercase tracking-tighter" style={{ color: COLORS.gray, fontSize: '14px' }}>Verified Cash Drop Receipt</p>
            </div>
          </div>
        </div>
      )}

      {/* UNRECONCILE CONFIRMATION MODAL */}
      {unreconcileModal.show && unreconcileModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative max-w-md w-full bg-white rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4" style={{ backgroundColor: COLORS.magenta }}>
              <h3 className="text-white font-black uppercase tracking-widest text-center" style={{ fontSize: '18px' }}>
                Confirm Unreconcile
              </h3>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <p className="mb-4 text-center" style={{ fontSize: '14px', color: COLORS.gray }}>
                Are you sure you want to unreconcile this record?
              </p>
              <p className="mb-6 text-center italic" style={{ fontSize: '14px', color: COLORS.gray }}>
                This will allow you to edit the counted amount again.
              </p>
              
              {/* Item Details */}
              {unreconcileModal.item && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold uppercase" style={{ fontSize: '14px', color: COLORS.gray }}>Date:</span>
                    <span className="font-black" style={{ fontSize: '14px', color: COLORS.gray }}>{formatPSTDate(unreconcileModal.item.date)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold uppercase" style={{ fontSize: '14px', color: COLORS.gray }}>Register:</span>
                    <span className="font-black" style={{ fontSize: '14px', color: COLORS.magenta }}>{unreconcileModal.item.workstation}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold uppercase" style={{ fontSize: '14px', color: COLORS.gray }}>Counted Amount:</span>
                    <span className="font-black" style={{ fontSize: '14px', color: COLORS.yellowGreen }}>${unreconcileModal.item.admin_count_amount}</span>
                  </div>
                </div>
              )}
              
              {/* Buttons */}
              <div className="flex flex-col md:flex-row gap-3">
                <button
                  onClick={handleUnreconcileConfirm}
                  className="flex-1 text-white font-black px-4 py-3 rounded-lg shadow-md transition-all active:scale-95 uppercase tracking-widest"
                  style={{ backgroundColor: COLORS.magenta, fontSize: '14px' }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setUnreconcileModal({ show: false, item: null })}
                  className="flex-1 text-white font-black px-4 py-3 rounded-lg shadow-md transition-all active:scale-95 uppercase tracking-widest"
                  style={{ backgroundColor: COLORS.gray, fontSize: '14px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashDropValidation;
