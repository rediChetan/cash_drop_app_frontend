import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../config/api";
import { getPSTDate, getPSTWeekStart, getPSTMonthStart, formatPSTDate } from '../utils/dateUtils';

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
  // Set page title
  useEffect(() => {
    document.title = 'Bank Drop';
  }, []);

  // Color constants
  const COLORS = {
    magenta: '#AA056C',
    yellowGreen: '#22C55E',
    lightPink: '#F46690',
    gray: '#64748B'
  };

  const [data, setData] = useState([]);
  const [dateFrom, setDateFrom] = useState(getPSTDate());
  const [dateTo, setDateTo] = useState(getPSTDate());
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingDropBatch, setLoadingDropBatch] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ show: false, text: '', type: 'info' });
  const [batchFilter, setBatchFilter] = useState('all'); // 'all' | 'pending'
  const [selectedBatchNumbers, setSelectedBatchNumbers] = useState(new Set()); // multi-select batch# for collective view/summary
  const [showBatchModal, setShowBatchModal] = useState(false); // { type: 'single', item } | { type: 'batch', ids } | false
  const [customBatchInput, setCustomBatchInput] = useState('');
  const [droppingSingleId, setDroppingSingleId] = useState(null); // loading state for single-row drop
  const [batchHistory, setBatchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [batchViewData, setBatchViewData] = useState([]);
  const [loadingBatchView, setLoadingBatchView] = useState(false);

  const showStatusMessage = (text, type = 'info') => {
    setStatusMessage({ show: true, text, type });
    setTimeout(() => setStatusMessage({ show: false, text: '', type: 'info' }), 5000);
  };

  const fetchData = async (from, to) => {
    const f = from !== undefined && from !== null ? from : dateFrom;
    const t = to !== undefined && to !== null ? to : dateTo;
    setLoading(true);
    const token = sessionStorage.getItem('access_token');
    try {
      const response = await fetch(
        `${API_ENDPOINTS.BANK_DROP}?datefrom=${f}&dateto=${t}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const result = await response.json();
      const newData = Array.isArray(result) ? result : [];
      setData(newData);
      if (from !== undefined || to !== undefined) {
        setDateFrom(f);
        setDateTo(t);
      }
      setSelectedIds(prev => {
        const updated = new Set();
        const validIds = new Set(newData.map(item => item.drop_entry_id));
        prev.forEach(id => {
          const item = newData.find(d => d.drop_entry_id === id);
          if (item && !item.bank_dropped && validIds.has(id)) updated.add(id);
        });
        return updated;
      });
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        showStatusMessage('Cannot connect to server. Please make sure the backend is running on http://localhost:8000', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchHistory = async () => {
    setLoadingHistory(true);
    const token = sessionStorage.getItem('access_token');
    try {
      const response = await fetch(API_ENDPOINTS.BANK_DROP_HISTORY, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const list = await response.json();
        setBatchHistory(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Fetch batch history error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchBatchHistory();
  }, []);

  const handleQuickFilter = (type) => {
    let start;
    if (type === 'WTD') {
      start = getPSTWeekStart();
      setDateFrom(start);
      setDateTo(getPSTDate());
      fetchData(start, getPSTDate());
    } else if (type === 'MTD') {
      start = getPSTMonthStart();
      setDateFrom(start);
      setDateTo(getPSTDate());
      fetchData(start, getPSTDate());
    } else {
      start = getPSTDate();
      setDateFrom(start);
      setDateTo(getPSTDate());
      fetchData(start, getPSTDate());
    }
  };

  const openDropModal = (type, payload) => {
    setCustomBatchInput('');
    setShowBatchModal({ type, ...payload });
  };

  const closeBatchModal = () => {
    setShowBatchModal(false);
    setCustomBatchInput('');
    setDroppingSingleId(null);
  };

  const confirmBatchModal = async () => {
    if (!showBatchModal) return;
    const batchNumber = customBatchInput.trim() || undefined;
    const isSingle = showBatchModal.type === 'single';
    const ids = isSingle ? [showBatchModal.item.drop_entry_id] : showBatchModal.ids;
    let updatedIds = [];
    if (!ids || ids.length === 0) {
      closeBatchModal();
      return;
    }
    if (isSingle) setDroppingSingleId(ids[0]);
    else setLoadingDropBatch(true);
    try {
      const token = sessionStorage.getItem('access_token');
      const numericIds = ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id) && id >= 1);
      if (numericIds.length === 0) {
        showStatusMessage('No valid cash drop IDs to mark as dropped.', 'error');
        closeBatchModal();
        setLoadingDropBatch(false);
        setDroppingSingleId(null);
        return;
      }
      const body = { cash_drop_ids: numericIds };
      if (batchNumber) body.batch_number = batchNumber;
      const response = await fetch(API_ENDPOINTS.BANK_DROP_MARK_DROPPED, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        const result = await response.json();
        const usedBatch = result.batch_number || '';
        updatedIds = (result.updated_ids || []).map((id) => Number(id));
        const numUpdated = result.updated_count ?? updatedIds.length;
        if (numUpdated === 0) {
          const errMsg = (result.errors && result.errors.length > 0)
            ? result.errors.map((e) => e.error).join('; ') || 'No cash drops were updated.'
            : 'No cash drops were marked as dropped.';
          showStatusMessage(errMsg, 'error');
        } else if (isSingle) {
          showStatusMessage(`Marked as bank dropped. Batch: ${usedBatch}`, 'success');
          setSelectedIds(prev => { const s = new Set(prev); s.delete(ids[0]); return s; });
        } else {
          const dropText = numUpdated === 1 ? '1 cash drop' : `${numUpdated} cash drops`;
          showStatusMessage(`Dropped ${dropText}. Batch: ${usedBatch}`, 'success');
          setSelectedIds(new Set());
        }
        const applyBatch = (prev) => prev.map((item) => {
          const dropId = Number(item.drop_entry_id);
          return updatedIds.includes(dropId)
            ? { ...item, bank_dropped: true, bank_drop_batch_number: usedBatch }
            : item;
        });
        if (updatedIds.length > 0) {
          setData(applyBatch);
          await fetchData();
          fetchBatchHistory();
          setTimeout(() => {
            setData((prev) => applyBatch(prev));
            if (isSingle) setDroppingSingleId(null);
          }, 0);
        } else if (isSingle) {
          setDroppingSingleId(null);
        }
      } else {
        const err = await response.json();
        showStatusMessage(err.error || 'Failed to mark as bank dropped', 'error');
      }
    } catch (error) {
      console.error('Error marking bank dropped:', error);
      showStatusMessage('Error marking as bank dropped', 'error');
    } finally {
      closeBatchModal();
      setLoadingDropBatch(false);
      if (updatedIds.length === 0) setDroppingSingleId(null);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const source = hasBatchSelection ? batchViewData : filteredData;
      const nonBankDroppedIds = new Set(
        source.filter(item => !item.bank_dropped).map(item => item.drop_entry_id)
      );
      setSelectedIds(nonBankDroppedIds);
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
    if (hasBatchSelection) {
      setLoadingSummary(true);
      try {
        const token = sessionStorage.getItem('access_token');
        const response = await fetch(API_ENDPOINTS.BANK_DROP_SUMMARY, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ batch_numbers: Array.from(selectedBatchNumbers) })
        });
        if (response.ok) {
          const summary = await response.json();
          setSummaryData({ ...summary, forConfirm: false, batch_count: selectedBatchNumbers.size });
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
      return;
    }

    const nonBankDroppedIds = Array.from(selectedIds).filter(id => {
      const item = data.find(d => d.drop_entry_id === id);
      return item && !item.bank_dropped;
    });
    if (nonBankDroppedIds.length === 0) {
      showStatusMessage('Please select at least one cash drop that is not already bank dropped', 'error');
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
        body: JSON.stringify({ cash_drop_ids: nonBankDroppedIds })
      });
      if (response.ok) {
        const summary = await response.json();
        setSummaryData({ ...summary, forConfirm: true });
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

  const getSelectedPendingIds = () =>
    Array.from(selectedIds).filter(id => {
      const item = data.find(d => d.drop_entry_id === id);
      return item && !item.bank_dropped;
    });

  const handleDropBatch = () => {
    const ids = getSelectedPendingIds();
    if (ids.length === 0) {
      showStatusMessage('Please select at least one pending cash drop to drop as a batch', 'error');
      return;
    }
    openDropModal('batch', { ids });
  };

  const handleConfirmBankDrop = async () => {
    if (!summaryData || !summaryData.forConfirm) return;
    const idsToMark = summaryData.cash_drops?.map(d => d.id) || Array.from(selectedIds);
    try {
      const token = sessionStorage.getItem('access_token');
      const response = await fetch(API_ENDPOINTS.BANK_DROP_MARK_DROPPED, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cash_drop_ids: idsToMark })
      });
      if (response.ok) {
        const result = await response.json();
        const batchNumber = result.batch_number || '';
        showStatusMessage(`Successfully marked ${result.updated_count} cash drop(s) as bank dropped. Batch: ${batchNumber}`, 'success');
        setShowSummaryModal(false);
        setSelectedIds(new Set());
        setSummaryData(null);
        const updatedIds = (result.updated_ids || []).map((id) => Number(id));
        const applyBatch = (prev) => prev.map((item) =>
          updatedIds.includes(Number(item.drop_entry_id))
            ? { ...item, bank_dropped: true, bank_drop_batch_number: batchNumber }
            : item
        );
        if (updatedIds.length > 0 && batchNumber) setData(applyBatch);
        await fetchData();
        if (updatedIds.length > 0 && batchNumber) setData(applyBatch);
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

  const hasBatchSelection = selectedBatchNumbers.size > 0;
  const filteredData = (() => {
    if (batchFilter === 'pending') return data.filter(item => !item.bank_dropped);
    return data;
  })();
  const listData = hasBatchSelection ? batchViewData : filteredData;

  useEffect(() => {
    if (selectedBatchNumbers.size > 0 && batchHistory.length > 0) {
      const validBatchNumbers = new Set(batchHistory.map((r) => r.batch_number));
      setSelectedBatchNumbers(prev => {
        const next = new Set(prev);
        let changed = false;
        next.forEach(b => { if (!validBatchNumbers.has(b)) { next.delete(b); changed = true; } });
        return changed ? new Set(next) : prev;
      });
    }
  }, [batchHistory]);

  useEffect(() => {
    if (selectedBatchNumbers.size === 0) {
      setBatchViewData([]);
      return;
    }
    const fetchBatchView = async () => {
      setLoadingBatchView(true);
      const token = sessionStorage.getItem('access_token');
      try {
        const response = await fetch(API_ENDPOINTS.BANK_DROP_BY_BATCHES, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ batch_numbers: Array.from(selectedBatchNumbers) })
        });
        if (response.ok) {
          const list = await response.json();
          setBatchViewData(Array.isArray(list) ? list : []);
        } else {
          setBatchViewData([]);
        }
      } catch (err) {
        console.error('Fetch batch view error:', err);
        setBatchViewData([]);
      } finally {
        setLoadingBatchView(false);
      }
    };
    fetchBatchView();
  }, [selectedBatchNumbers]);

  const selectedPendingCount = getSelectedPendingIds().length;
  const canGetSummary = hasBatchSelection || selectedPendingCount > 0;
  const canDropBatch = !hasBatchSelection && (batchFilter === 'all' || batchFilter === 'pending') && selectedPendingCount > 0;
  const getSummaryLabel = () => {
    if (hasBatchSelection) return `Get Summary (${selectedBatchNumbers.size} batch(es))`;
    const n = Array.from(selectedIds).filter(id => {
      const item = data.find(d => d.drop_entry_id === id);
      return item && !item.bank_dropped;
    }).length;
    return `Get Summary (${n})`;
  };

  const toggleBatchFromHistory = (batchNumber) => {
    setSelectedBatchNumbers(prev => {
      const next = new Set(prev);
      if (next.has(batchNumber)) next.delete(batchNumber);
      else next.add(batchNumber);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 py-4 md:py-6" style={{ fontFamily: 'Calibri, Verdana, sans-serif', fontSize: '14px', color: COLORS.gray }}>
      {/* Status Message */}
      {statusMessage.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          statusMessage.type === 'error' ? 'bg-red-100 border-l-4 border-red-500' : 
          statusMessage.type === 'success' ? 'bg-green-100 border-l-4 border-green-500' : 
          'bg-blue-100 border-l-4 border-blue-500'
        }`}>
          <p className={`font-bold ${statusMessage.type === 'error' ? 'text-red-700' : statusMessage.type === 'success' ? 'text-green-700' : 'text-blue-700'}`} style={{ fontSize: '14px' }}>
            {statusMessage.text}
          </p>
        </div>
      )}

      {/* Batch# modal for single drop or drop batch */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="font-black mb-2" style={{ fontSize: '18px', color: COLORS.gray }}>Bank Drop</h3>
            <p className="mb-4 text-sm" style={{ color: COLORS.gray }}>
              {showBatchModal.type === 'single'
                ? 'Mark this cash drop as bank dropped. Optionally enter a batch# or leave blank to auto-generate.'
                : `Mark ${showBatchModal.ids.length} selected cash drop(s) as bank dropped with the same batch#. Optionally enter a batch# or leave blank to auto-generate.`}
            </p>
            <label className="block text-xs font-black uppercase mb-1" style={{ color: COLORS.gray }}>Batch# (optional)</label>
            <input
              type="text"
              value={customBatchInput}
              onChange={(e) => setCustomBatchInput(e.target.value)}
              placeholder="Leave blank for auto"
              className="w-full p-2 border rounded mb-6"
              style={{ fontSize: '14px' }}
              onKeyDown={(e) => e.key === 'Enter' && confirmBatchModal()}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmBatchModal}
                className="flex-1 text-white py-2 rounded font-bold"
                style={{ backgroundColor: COLORS.magenta, fontSize: '14px' }}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={closeBatchModal}
                className="flex-1 py-2 rounded font-bold border"
                style={{ backgroundColor: '#fff', color: COLORS.gray, fontSize: '14px', borderColor: COLORS.gray }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-6 px-2 md:px-4">
        {/* LEFT: main list */}
        <div className="flex-1 min-w-0 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        
        {/* HEADER & FILTERS */}
        <div className="p-5 md:p-6 border-b border-gray-100 bg-white">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-black uppercase italic tracking-tighter" style={{ fontSize: '24px' }}>Bank <span style={{ color: COLORS.magenta }}>Drop</span></h2>
                <p className="text-xs font-bold tracking-widest uppercase mt-0.5" style={{ color: COLORS.gray, fontSize: '13px' }}>Reconciled Cash Drops for Bank Deposit</p>
              </div>
            </div>
            {/* One row: From, To, Fetch, WTD, MTD, View All|Pending */}
            <div className="flex flex-wrap items-end gap-3 md:gap-4 bg-gray-50/80 p-4 rounded-lg border border-gray-100">
              <div className="flex flex-col">
                <label className="text-xs font-black uppercase mb-1" style={{ color: COLORS.gray, fontSize: '12px' }}>From</label>
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)} 
                  className="p-2 border rounded bg-white min-w-[130px]" 
                  style={{ fontSize: '14px' }}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-black uppercase mb-1" style={{ color: COLORS.gray, fontSize: '12px' }}>To</label>
                <input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)} 
                  className="p-2 border rounded bg-white min-w-[130px]" 
                  style={{ fontSize: '14px' }}
                />
              </div>
              <button 
                onClick={() => fetchData(dateFrom, dateTo)} 
                className="text-white px-4 py-2 rounded font-bold transition h-[38px]"
                style={{ backgroundColor: COLORS.magenta, fontSize: '14px' }}
              >
                Fetch
              </button>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleQuickFilter('WTD')} 
                  className="px-3 py-2 bg-white border rounded font-black hover:bg-gray-50 h-[38px]"
                  style={{ fontSize: '14px' }}
                >
                  WTD
                </button>
                <button 
                  onClick={() => handleQuickFilter('MTD')} 
                  className="px-3 py-2 bg-white border rounded font-black hover:bg-gray-50 h-[38px]"
                  style={{ fontSize: '14px' }}
                >
                  MTD
                </button>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-black uppercase mb-1" style={{ color: COLORS.gray, fontSize: '12px' }}>View</label>
                <div className="flex rounded border border-gray-300 overflow-hidden bg-white h-[38px]">
                  <button
                    type="button"
                    onClick={() => setBatchFilter('all')}
                    className={`px-4 py-2 font-bold transition whitespace-nowrap h-full ${batchFilter === 'all' ? 'text-white' : 'bg-white'}`}
                    style={{
                      fontSize: '14px',
                      backgroundColor: batchFilter === 'all' ? COLORS.magenta : 'transparent',
                      color: batchFilter === 'all' ? '#fff' : COLORS.gray
                    }}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchFilter('pending')}
                    className={`px-4 py-2 font-bold transition whitespace-nowrap h-full ${batchFilter === 'pending' ? 'text-white' : 'bg-white'}`}
                    style={{
                      fontSize: '14px',
                      backgroundColor: batchFilter === 'pending' ? COLORS.magenta : 'transparent',
                      color: batchFilter === 'pending' ? '#fff' : COLORS.gray
                    }}
                  >
                    Pending
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Selection Controls */}
          {data.length > 0 && (
            <div className="mt-4 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 p-4 rounded-lg" style={{ backgroundColor: COLORS.lightPink + '15' }}>
              {!hasBatchSelection ? (
                <label className="flex items-center gap-2 font-bold" style={{ fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={listData.filter(item => !item.bank_dropped).length > 0 &&
                      listData.filter(item => !item.bank_dropped).every(item => selectedIds.has(item.drop_entry_id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Select All ({selectedPendingCount} selected)
                </label>
              ) : null}
              <button
                onClick={handleGetSummary}
                disabled={!canGetSummary || loadingSummary}
                className="text-white px-4 md:px-6 py-2 rounded font-bold disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                style={{ 
                  backgroundColor: !canGetSummary || loadingSummary ? COLORS.gray : COLORS.yellowGreen,
                  fontSize: '14px'
                }}
              >
                {loadingSummary ? 'Loading...' : getSummaryLabel()}
              </button>
              <button
                onClick={handleDropBatch}
                disabled={!canDropBatch || loadingDropBatch}
                className="text-white px-4 md:px-6 py-2 rounded font-bold disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                style={{ 
                  backgroundColor: !canDropBatch || loadingDropBatch ? COLORS.gray : COLORS.magenta,
                  fontSize: '14px'
                }}
                title="Mark all selected pending drops as bank dropped in one batch"
              >
                {loadingDropBatch ? 'Dropping...' : `Drop Batch (${selectedPendingCount})`}
              </button>
            </div>
          )}
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto p-2 md:px-4 md:pb-4">
          <table className="w-full text-left min-w-full">
            <thead>
              <tr className="bg-gray-50 font-black uppercase border-b" style={{ color: COLORS.gray }}>
                <th className="p-2 md:p-4 w-12" style={{ fontSize: '14px' }}>
                  {!hasBatchSelection && (
                    <input
                      type="checkbox"
                      checked={listData.filter(item => !item.bank_dropped).length > 0 &&
                        listData.filter(item => !item.bank_dropped).every(item => selectedIds.has(item.drop_entry_id))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4"
                    />
                  )}
                </th>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Batch#</th>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Date / Register / Shift</th>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Reconciled Amount</th>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Cash Drop Receipt Amount</th>
                <th className="p-2 md:p-4" style={{ fontSize: '14px' }}>Reconcile Delta</th>
              </tr>
            </thead>
            <tbody>
              {hasBatchSelection && loadingBatchView ? (
                <tr>
                  <td colSpan="7" className="p-20 text-center italic font-bold uppercase tracking-widest" style={{ color: COLORS.gray, fontSize: '14px' }}>
                    Loading batch items...
                  </td>
                </tr>
              ) : listData.length > 0 ? listData.map(item => (
                <tr key={item.id} className="border-b hover:bg-pink-50/30 transition-colors">
                  <td className="p-2 md:p-4">
                    {!hasBatchSelection && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.drop_entry_id)}
                        onChange={() => handleSelectItem(item.drop_entry_id)}
                        disabled={item.bank_dropped}
                        className="w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={item.bank_dropped ? 'Already bank dropped - cannot be selected' : ''}
                      />
                    )}
                  </td>
                  <td className="p-2 md:p-4 font-bold" style={{ fontSize: '14px', color: COLORS.gray }}>
                    {item.bank_drop_batch_number || '—'}
                  </td>
                  <td className="p-2 md:p-4">
                    <div className="font-black" style={{ fontSize: '14px' }}>{formatPSTDate(item.date)}</div>
                    <div className="font-bold uppercase" style={{ color: COLORS.magenta, fontSize: '14px' }}>
                      {item.workstation} | Shift {item.shift_number}
                    </div>
                    <div style={{ color: COLORS.gray, fontSize: '14px' }}>{item.user_name}</div>
                  </td>
                  <td className="p-2 md:p-4">
                    {item.label_image_url ? (
                      <button 
                        onClick={() => setSelectedImage(item.label_image_url)}
                        className="font-black border-b-2 border-dotted hover:text-pink-600 transition-colors"
                        style={{ fontSize: '14px', color: COLORS.gray, borderColor: COLORS.lightPink }}
                      >
                        ${item.reconciled_amount || item.admin_count_amount || item.system_drop_amount}
                      </button>
                    ) : (
                      <span className="font-black" style={{ fontSize: '14px', color: COLORS.gray }}>
                        ${item.reconciled_amount || item.admin_count_amount || item.system_drop_amount}
                      </span>
                    )}
                    {item.label_image_url && (
                      <div className="uppercase mt-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Click to view receipt</div>
                    )}
                  </td>
                  <td className="p-2 md:p-4 font-bold" style={{ fontSize: '14px', color: COLORS.gray }}>${item.ws_label_amount}</td>
                  <td className={`p-2 md:p-4 font-black ${parseFloat(item.reconcile_delta) !== 0 ? 'text-red-500' : 'text-gray-300'}`} style={{ fontSize: '14px' }}>
                    ${item.reconcile_delta}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="p-20 text-center italic font-bold uppercase tracking-widest" style={{ color: COLORS.gray, fontSize: '14px' }}>
                    {loading ? "Loading Records..." : hasBatchSelection ? "No records in selected batches" : batchFilter === 'pending' ? "No pending bank drops" : "No reconciled records found for this period"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>

        {/* RIGHT: History - select batches to see them in the list */}
        <div className="lg:w-[520px] flex-shrink-0 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50/80 flex flex-row justify-between items-start gap-3">
            <div className="min-w-0">
              <h3 className="font-black uppercase italic tracking-tighter" style={{ fontSize: '18px', color: COLORS.gray }}>History</h3>
              <p className="text-xs font-bold tracking-widest uppercase mt-0.5" style={{ color: COLORS.gray }}>Select batch to see entries in list</p>
              {hasBatchSelection && (
                <button
                  type="button"
                  onClick={() => setSelectedBatchNumbers(new Set())}
                  className="mt-2 text-xs font-bold underline hover:no-underline"
                  style={{ color: COLORS.magenta }}
                >
                  Clear selection
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={fetchBatchHistory}
              disabled={loadingHistory}
              className="flex-shrink-0 px-3 py-1.5 rounded font-bold text-white text-sm disabled:opacity-50"
              style={{ backgroundColor: COLORS.magenta }}
            >
              {loadingHistory ? '...' : 'Refresh'}
            </button>
          </div>
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-left" style={{ fontSize: '13px' }}>
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="font-black uppercase border-b" style={{ color: COLORS.gray }}>
                  <th className="p-2 w-8"></th>
                  <th className="p-2">Batch#</th>
                  <th className="p-2">Drops</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center font-bold" style={{ color: COLORS.gray }}>Loading...</td>
                  </tr>
                ) : batchHistory.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center italic" style={{ color: COLORS.gray }}>No dropped batches yet</td>
                  </tr>
                ) : (
                  batchHistory.map((row) => (
                    <tr
                      key={row.id || row.batch_number}
                      onClick={() => toggleBatchFromHistory(row.batch_number)}
                      className={`border-b cursor-pointer transition-colors ${selectedBatchNumbers.has(row.batch_number) ? 'bg-pink-100' : 'hover:bg-pink-50/30'}`}
                    >
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedBatchNumbers.has(row.batch_number)}
                          onChange={() => toggleBatchFromHistory(row.batch_number)}
                          className="w-4 h-4"
                          style={{ accentColor: COLORS.magenta }}
                        />
                      </td>
                      <td className="p-2 font-bold" style={{ color: COLORS.magenta }}>{row.batch_number}</td>
                      <td className="p-2" style={{ color: COLORS.gray }}>{row.drop_count}</td>
                      <td className="p-2 text-xs" style={{ color: COLORS.gray }}>
                        {row.created_at ? new Date(row.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="p-2 font-bold" style={{ color: COLORS.yellowGreen }}>
                        {row.batch_drop_amount != null ? `$${Number(row.batch_drop_amount).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
            {summaryData.batch_count > 1 && (
              <p className="mb-2 font-bold uppercase tracking-wide" style={{ fontSize: '12px', color: COLORS.magenta }}>Collective summary for {summaryData.batch_count} batches</p>
            )}
            <p className="mb-6" style={{ fontSize: '14px', color: COLORS.gray }}>
              Total Cash Drops: {summaryData.count} | Total Amount: <span className="font-black" style={{ color: COLORS.yellowGreen, fontSize: '18px' }}>${(summaryData.total_amount ?? 0).toFixed(2)}</span>
            </p>

            <div className="mb-6">
              <h4 className="font-bold mb-3" style={{ fontSize: '18px', color: COLORS.gray }}>Denomination Totals:</h4>
              <div className="grid grid-cols-2 gap-2">
                {DENOMINATION_CONFIG.map(denom => {
                  const count = summaryData.totals[denom.field] || 0;
                  return (
                    <div key={denom.field} className="flex justify-between text-xs bg-white p-1.5 px-2 rounded border border-gray-100">
                      <span style={{ color: COLORS.gray, fontSize: '14px' }}>{denom.display}</span>
                      <span className="font-bold" style={{ fontSize: '14px' }}>{count}</span>
                    </div>
                  );
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

            <div className="flex flex-col md:flex-row gap-4">
              {summaryData.forConfirm === true && (
                <button
                  onClick={handleConfirmBankDrop}
                  className="flex-1 text-white px-4 md:px-6 py-3 rounded-lg font-bold transition"
                  style={{ backgroundColor: COLORS.yellowGreen, fontSize: '14px' }}
                >
                  Confirm Bank Drop
                </button>
              )}
              <button
                onClick={() => {
                  setShowSummaryModal(false);
                  setSummaryData(null);
                }}
                className="flex-1 text-white px-4 md:px-6 py-3 rounded-lg font-bold transition"
                style={{ backgroundColor: COLORS.gray, fontSize: '14px' }}
              >
                {summaryData.forConfirm ? 'Cancel' : 'Close'}
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
              <p className="font-black uppercase tracking-tighter" style={{ color: COLORS.gray, fontSize: '14px' }}>Verified Cash Drop Receipt</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankDrop;
