import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../config/api";

const DENOMINATION_CONFIG = [
  { name: 'Hundreds', value: 100, field: 'hundreds', display: 'Hundreds ($100)' },
  { name: 'Fifties', value: 50, field: 'fifties', display: 'Fifties ($50)' },
  { name: 'Twenties', value: 20, field: 'twenties', display: 'Twenties ($20)' },
  { name: 'Tens', value: 10, field: 'tens', display: 'Tens ($10)' },
  { name: 'Fives', value: 5, field: 'fives', display: 'Fives ($5)' },
  { name: 'Twos', value: 2, field: 'twos', display: 'Twos ($2)' },
  { name: 'Ones', value: 1, field: 'ones', display: 'Ones ($1)' },
  { name: 'Half Dollars', value: 0.50, field: 'half_dollars', display: 'Half Dollars ($0.50)' },
  { name: 'Quarters', value: 0.25, field: 'quarters', display: 'Quarters ($0.25)' },
  { name: 'Dimes', value: 0.10, field: 'dimes', display: 'Dimes ($0.10)' },
  { name: 'Nickels', value: 0.05, field: 'nickels', display: 'Nickels ($0.05)' },
  { name: 'Pennies', value: 0.01, field: 'pennies', display: 'Pennies ($0.01)' },
];

const BankDrop = () => {
  // Color constants
  const COLORS = {
    magenta: '#AA056C',
    yellowGreen: '#C4CB07',
    lightPink: '#F46690',
    gray: '#64748B'
  };

  const [data, setData] = useState([]);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedCashDrop, setSelectedCashDrop] = useState(null);
  const [editingDenominations, setEditingDenominations] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ show: false, text: '', type: 'info' });

  const showStatusMessage = (text, type = 'info') => {
    setStatusMessage({ show: true, text, type });
    setTimeout(() => setStatusMessage({ show: false, text: '', type: 'info' }), 5000);
  };

  const fetchData = async () => {
    setLoading(true);
    const token = sessionStorage.getItem('access_token');
    try {
      const response = await fetch(
        `${API_ENDPOINTS.BANK_DROP}?datefrom=${dateFrom}&dateto=${dateTo}`,
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
        showStatusMessage('Cannot connect to server. Please make sure the backend is running on http://localhost:8000', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleBankDroppedToggle = async (item) => {
    const newValue = !item.bank_dropped;
    
    // If toggling to true, open modal to edit denominations
    if (newValue) {
      try {
        const token = sessionStorage.getItem('access_token');
        const response = await fetch(
          API_ENDPOINTS.BANK_DROP_CASH_DROP(item.drop_entry_id),
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (response.ok) {
          const cashDrop = await response.json();
          setSelectedCashDrop(cashDrop);
          setEditingDenominations({
            hundreds: cashDrop.hundreds || 0,
            fifties: cashDrop.fifties || 0,
            twenties: cashDrop.twenties || 0,
            tens: cashDrop.tens || 0,
            fives: cashDrop.fives || 0,
            twos: cashDrop.twos || 0,
            ones: cashDrop.ones || 0,
            half_dollars: cashDrop.half_dollars || 0,
            quarters: cashDrop.quarters || 0,
            dimes: cashDrop.dimes || 0,
            nickels: cashDrop.nickels || 0,
            pennies: cashDrop.pennies || 0,
          });
        } else {
          showStatusMessage('Failed to load cash drop details', 'error');
        }
      } catch (error) {
        console.error('Error loading cash drop:', error);
        showStatusMessage('Error loading cash drop details', 'error');
      }
    } else {
      // If toggling to false, just update the bank_dropped status
      await updateBankDroppedStatus(item.drop_entry_id, false);
    }
  };

  const updateBankDroppedStatus = async (cashDropId, status) => {
    try {
      const token = sessionStorage.getItem('access_token');
      const response = await fetch(
        API_ENDPOINTS.BANK_DROP_UPDATE_DENOMINATIONS(cashDropId),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ bank_dropped: status })
        }
      );
      
      if (response.ok) {
        fetchData(); // Refresh data
      } else {
        const err = await response.json();
        showStatusMessage(err.error || 'Failed to update bank dropped status', 'error');
      }
    } catch (error) {
      console.error('Error updating bank dropped status:', error);
      showStatusMessage('Error updating bank dropped status', 'error');
    }
  };

  const handleSaveDenominations = async () => {
    if (!selectedCashDrop) return;
    
    try {
      const token = sessionStorage.getItem('access_token');
      const response = await fetch(
        API_ENDPOINTS.BANK_DROP_UPDATE_DENOMINATIONS(selectedCashDrop.id),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...editingDenominations,
            bank_dropped: true
          })
        }
      );
      
      if (response.ok) {
        setSelectedCashDrop(null);
        setEditingDenominations({});
        fetchData(); // Refresh data
        showStatusMessage('Denominations updated and marked as bank dropped', 'success');
      } else {
        const err = await response.json();
        showStatusMessage(err.error || 'Failed to update denominations', 'error');
      }
    } catch (error) {
      console.error('Error saving denominations:', error);
      showStatusMessage('Error saving denominations', 'error');
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = new Set(data.map(item => item.drop_entry_id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (cashDropId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(cashDropId)) {
      newSelected.delete(cashDropId);
    } else {
      newSelected.add(cashDropId);
    }
    setSelectedIds(newSelected);
  };

  const handleGetSummary = async () => {
    if (selectedIds.size === 0) {
      showStatusMessage('Please select at least one cash drop', 'error');
      return;
    }

    setLoadingSummary(true);
    try {
      const token = sessionStorage.getItem('access_token');
      const response = await fetch(API_ENDPOINTS.BANK_DROP_SUMMARY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cash_drop_ids: Array.from(selectedIds)
        })
      });

      if (response.ok) {
        const summary = await response.json();
        setSummaryData(summary);
        setShowSummaryModal(true);
      } else {
        const err = await response.json();
        showStatusMessage(err.error || 'Failed to get summary', 'error');
      }
    } catch (error) {
      console.error('Error getting summary:', error);
      showStatusMessage('Error getting summary', 'error');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleConfirmBankDrop = async () => {
    if (!summaryData) return;

    try {
      const token = sessionStorage.getItem('access_token');
      const response = await fetch(API_ENDPOINTS.BANK_DROP_MARK_DROPPED, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cash_drop_ids: Array.from(selectedIds)
        })
      });

      if (response.ok) {
        const result = await response.json();
        showStatusMessage(`Successfully marked ${result.updated_count} cash drop(s) as bank dropped`, 'success');
        setShowSummaryModal(false);
        setSelectedIds(new Set());
        setSummaryData(null);
        fetchData(); // Refresh data
      } else {
        const err = await response.json();
        showStatusMessage(err.error || 'Failed to mark as bank dropped', 'error');
      }
    } catch (error) {
      console.error('Error confirming bank drop:', error);
      showStatusMessage('Error confirming bank drop', 'error');
    }
  };

  const calculateTotal = (denominations) => {
    return DENOMINATION_CONFIG.reduce((total, denom) => {
      return total + (denominations[denom.field] || 0) * denom.value;
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8" style={{ fontFamily: 'Calibri, Verdana, sans-serif', fontSize: '12px', color: COLORS.gray }}>
      {/* Status Message */}
      {statusMessage.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          statusMessage.type === 'error' ? 'bg-red-100 border-l-4 border-red-500' : 
          statusMessage.type === 'success' ? 'bg-green-100 border-l-4 border-green-500' : 
          'bg-blue-100 border-l-4 border-blue-500'
        }`}>
          <p className={`font-bold ${statusMessage.type === 'error' ? 'text-red-700' : statusMessage.type === 'success' ? 'text-green-700' : 'text-blue-700'}`} style={{ fontSize: '12px' }}>
            {statusMessage.text}
          </p>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        
        {/* HEADER & FILTERS */}
        <div className="p-6 border-b bg-white">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h2 className="font-black uppercase italic tracking-tighter" style={{ fontSize: '24px' }}>Bank <span style={{ color: COLORS.magenta }}>Drop</span></h2>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.gray, fontSize: '12px' }}>Reconciled Cash Drops for Bank Deposit</p>
            </div>

            <div className="flex flex-wrap items-end gap-4 bg-gray-50 p-4 rounded-lg border">
              {/* Custom Date Inputs */}
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase mb-1" style={{ color: COLORS.gray }}>From</label>
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)} 
                  className="text-xs p-2 border rounded bg-white" 
                  style={{ fontSize: '12px' }}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase mb-1" style={{ color: COLORS.gray }}>To</label>
                <input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)} 
                  className="text-xs p-2 border rounded bg-white" 
                  style={{ fontSize: '12px' }}
                />
              </div>
              
              <button 
                onClick={fetchData} 
                className="text-white px-4 py-2 rounded text-xs font-bold transition"
                style={{ backgroundColor: COLORS.magenta, fontSize: '12px' }}
              >
                Fetch
              </button>

              <div className="flex gap-1 border-l pl-4">
                <button 
                  onClick={() => handleQuickFilter('WTD')} 
                  className="px-3 py-2 bg-white border rounded text-[10px] font-black hover:bg-gray-50"
                  style={{ fontSize: '12px' }}
                >
                  WTD
                </button>
                <button 
                  onClick={() => handleQuickFilter('MTD')} 
                  className="px-3 py-2 bg-white border rounded text-[10px] font-black hover:bg-gray-50"
                  style={{ fontSize: '12px' }}
                >
                  MTD
                </button>
              </div>
            </div>
          </div>

          {/* Selection Controls */}
          {data.length > 0 && (
            <div className="mt-4 flex items-center gap-4 p-3 rounded-lg" style={{ backgroundColor: COLORS.lightPink + '20' }}>
              <label className="flex items-center gap-2 font-bold" style={{ fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === data.length && data.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4"
                />
                Select All ({selectedIds.size} selected)
              </label>
              <button
                onClick={handleGetSummary}
                disabled={selectedIds.size === 0 || loadingSummary}
                className="text-white px-6 py-2 rounded font-bold disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                style={{ 
                  backgroundColor: selectedIds.size === 0 || loadingSummary ? COLORS.gray : COLORS.yellowGreen,
                  fontSize: '12px'
                }}
              >
                {loadingSummary ? 'Loading...' : `Get Summary (${selectedIds.size})`}
              </button>
            </div>
          )}
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black uppercase border-b" style={{ color: COLORS.gray }}>
                <th className="p-4 w-12" style={{ fontSize: '12px' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4"
                  />
                </th>
                <th className="p-4" style={{ fontSize: '12px' }}>Date / Register / Shift</th>
                <th className="p-4" style={{ fontSize: '12px' }}>Reconciled Amount</th>
                <th className="p-4" style={{ fontSize: '12px' }}>Cash Drop Receipt Amount</th>
                <th className="p-4" style={{ fontSize: '12px' }}>Variance</th>
                <th className="p-4" style={{ fontSize: '12px' }}>Bank Dropped</th>
                <th className="p-4" style={{ fontSize: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? data.map(item => (
                <tr key={item.id} className="border-b hover:bg-pink-50/30 transition-colors">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.drop_entry_id)}
                      onChange={() => handleSelectItem(item.drop_entry_id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="p-4">
                    <div className="text-xs font-black" style={{ fontSize: '12px' }}>{item.date}</div>
                    <div className="text-[10px] font-bold uppercase" style={{ color: COLORS.magenta, fontSize: '12px' }}>
                      {item.workstation} | Shift {item.shift_number}
                    </div>
                    <div className="text-[10px]" style={{ color: COLORS.gray, fontSize: '12px' }}>{item.user_name}</div>
                  </td>
                  <td className="p-4">
                    {item.label_image_url ? (
                      <button 
                        onClick={() => setSelectedImage(item.label_image_url)}
                        className="text-sm font-black border-b-2 border-dotted hover:text-pink-600 transition-colors"
                        style={{ fontSize: '12px', color: COLORS.gray, borderColor: COLORS.lightPink }}
                      >
                        ${item.reconciled_amount || item.admin_count_amount || item.system_drop_amount}
                      </button>
                    ) : (
                      <span className="text-sm font-black" style={{ fontSize: '12px', color: COLORS.gray }}>
                        ${item.reconciled_amount || item.admin_count_amount || item.system_drop_amount}
                      </span>
                    )}
                    {item.label_image_url && (
                      <div className="text-[9px] uppercase mt-1" style={{ color: COLORS.gray }}>Click to view receipt</div>
                    )}
                  </td>
                  <td className="p-4 font-bold" style={{ fontSize: '12px', color: COLORS.gray }}>${item.ws_label_amount}</td>
                  <td className={`p-4 font-black ${parseFloat(item.variance) !== 0 ? 'text-red-500' : 'text-gray-300'}`} style={{ fontSize: '12px' }}>
                    ${item.variance}
                  </td>
                  <td className="p-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.bank_dropped || false}
                        onChange={() => handleBankDroppedToggle(item)}
                        className="w-5 h-5 rounded focus:ring-2"
                        style={{ accentColor: COLORS.magenta }}
                      />
                      <span className="font-bold" style={{ fontSize: '12px' }}>
                        {item.bank_dropped ? 'Yes' : 'No'}
                      </span>
                    </label>
                  </td>
                  <td className="p-4">
                    {item.bank_dropped && (
                      <button
                        onClick={() => handleBankDroppedToggle(item)}
                        className="text-xs hover:underline font-bold transition-colors"
                        style={{ color: COLORS.magenta, fontSize: '12px' }}
                      >
                        Edit Denominations
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="p-20 text-center italic font-bold uppercase tracking-widest" style={{ color: COLORS.gray, fontSize: '12px' }}>
                    {loading ? "Loading Records..." : "No reconciled records found for this period"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FOR EDITING DENOMINATIONS */}
      {selectedCashDrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="relative max-w-2xl w-full bg-white rounded-lg p-6 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {
                setSelectedCashDrop(null);
                setEditingDenominations({});
              }}
              className="absolute top-4 right-4 bg-red-600 text-white w-8 h-8 rounded-full font-bold flex items-center justify-center hover:bg-red-700 z-10"
            >
              ✕
            </button>
            
            <h3 className="font-black mb-4" style={{ fontSize: '18px', color: COLORS.gray }}>Edit Denominations - {selectedCashDrop.workstation} | {selectedCashDrop.date}</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {DENOMINATION_CONFIG.map(denom => (
                <div key={denom.field} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <label className="font-bold" style={{ fontSize: '12px', color: COLORS.gray }}>{denom.display}</label>
                  <input
                    type="number"
                    min="0"
                    value={editingDenominations[denom.field] || 0}
                    onChange={(e) => setEditingDenominations({
                      ...editingDenominations,
                      [denom.field]: parseInt(e.target.value) || 0
                    })}
                    className="w-20 p-2 border rounded text-right font-bold"
                    style={{ fontSize: '12px' }}
                  />
                </div>
              ))}
            </div>

            <div className="mb-6 p-4 rounded border" style={{ backgroundColor: COLORS.lightPink + '20', borderColor: COLORS.lightPink }}>
              <div className="flex justify-between items-center">
                <span className="font-bold" style={{ fontSize: '12px', color: COLORS.gray }}>Total Amount:</span>
                <span className="font-black" style={{ fontSize: '18px', color: COLORS.magenta }}>
                  ${calculateTotal(editingDenominations).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSaveDenominations}
                className="flex-1 text-white px-6 py-3 rounded-lg font-bold transition"
                style={{ backgroundColor: COLORS.yellowGreen, fontSize: '12px' }}
              >
                Save & Mark as Bank Dropped
              </button>
              <button
                onClick={() => {
                  setSelectedCashDrop(null);
                  setEditingDenominations({});
                }}
                className="flex-1 text-white px-6 py-3 rounded-lg font-bold transition"
                style={{ backgroundColor: COLORS.gray, fontSize: '12px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY MODAL */}
      {showSummaryModal && summaryData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="relative max-w-4xl w-full bg-white rounded-lg p-6 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {
                setShowSummaryModal(false);
                setSummaryData(null);
              }}
              className="absolute top-4 right-4 bg-red-600 text-white w-8 h-8 rounded-full font-bold flex items-center justify-center hover:bg-red-700 z-10"
            >
              ✕
            </button>
            
            <h3 className="font-black mb-4" style={{ fontSize: '18px', color: COLORS.gray }}>Bank Drop Summary</h3>
            <p className="mb-6" style={{ fontSize: '12px', color: COLORS.gray }}>
              Total Cash Drops: {summaryData.count} | Total Amount: <span className="font-black" style={{ color: COLORS.yellowGreen, fontSize: '18px' }}>${summaryData.total_amount.toFixed(2)}</span>
            </p>

            <div className="mb-6">
              <h4 className="font-bold mb-3" style={{ fontSize: '18px', color: COLORS.gray }}>Denomination Totals:</h4>
              <div className="grid grid-cols-3 gap-3">
                {DENOMINATION_CONFIG.map(denom => {
                  const count = summaryData.totals[denom.field] || 0;
                  const value = count * denom.value;
                  return count > 0 ? (
                    <div key={denom.field} className="p-3 bg-gray-50 rounded border flex justify-between items-center">
                      <span className="font-bold" style={{ fontSize: '12px', color: COLORS.gray }}>{denom.display}:</span>
                      <div className="text-right">
                        <div className="font-black" style={{ fontSize: '12px' }}>{count} × ${denom.value.toFixed(2)}</div>
                        <div className="text-xs" style={{ color: COLORS.gray }}>= ${value.toFixed(2)}</div>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <div className="mb-6 p-4 rounded-lg border-2" style={{ backgroundColor: COLORS.yellowGreen + '20', borderColor: COLORS.yellowGreen }}>
              <div className="flex justify-between items-center">
                <span className="font-bold" style={{ fontSize: '18px', color: COLORS.gray }}>Grand Total:</span>
                <span className="font-black" style={{ fontSize: '24px', color: COLORS.yellowGreen }}>
                  ${summaryData.total_amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleConfirmBankDrop}
                className="flex-1 text-white px-6 py-3 rounded-lg font-bold transition"
                style={{ backgroundColor: COLORS.yellowGreen, fontSize: '14px' }}
              >
                Confirm Bank Drop
              </button>
              <button
                onClick={() => {
                  setShowSummaryModal(false);
                  setSummaryData(null);
                }}
                className="flex-1 text-white px-6 py-3 rounded-lg font-bold transition"
                style={{ backgroundColor: COLORS.gray, fontSize: '12px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
};

export default BankDrop;
