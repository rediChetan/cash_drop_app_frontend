import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import { getPSTDate, getPSTWeekStart, getPSTMonthStart, getPSTYearStart, formatPSTDateTime, formatPSTDate } from '../utils/dateUtils';

function CdDashboard() {
  const navigate = useNavigate();
  const [selectedDateFrom, setSelectedDateFrom] = useState(getPSTDate());
  const [selectedDateTo, setSelectedDateTo] = useState(getPSTDate());
  const [cashDrops, setCashDrops] = useState([]);
  const [cashDrawers, setCashDrawers] = useState([]);
  const [activeDate, setActiveDate] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ignoreModal, setIgnoreModal] = useState({ show: false, item: null, reason: '' });
  const [ignoreDrawerModal, setIgnoreDrawerModal] = useState({ show: false, item: null });
  const [deleteDraftModal, setDeleteDraftModal] = useState({ show: false, item: null, type: 'drop' }); // type: 'drop' | 'drawer'
  const [statusMessage, setStatusMessage] = useState({ show: false, text: '', type: 'info' });
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'drafted' | 'submitted' | 'ignored' | 'reconciled' | 'bank_dropped'
  const [currentUserId, setCurrentUserId] = useState(null);

  // Set page title
  useEffect(() => {
    document.title = 'Cash Drop Dashboard';
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await fetch(API_ENDPOINTS.CURRENT_USER, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const user = await res.json();
          setCurrentUserId(user.id ?? null);
        }
      } catch (e) {
        console.error('Fetch current user:', e);
      }
    };
    fetchUser();
  }, []);

  const COLORS = {
    magenta: '#AA056C',
    yellowGreen: '#22C55E',
    lightPink: '#F46690',
    gray: '#64748B'
  };

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

  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const fetchData = async (from, to) => {
    setError('');
    setActiveDate(null);
    try {
      const [dropResponse, drawerResponse] = await Promise.all([
        fetch(`${API_ENDPOINTS.CASH_DROP}?datefrom=${from}&dateto=${to}`, {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('access_token')}` },
        }),
        fetch(`${API_ENDPOINTS.CASH_DRAWER}?datefrom=${from}&dateto=${to}`, {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('access_token')}` },
        }),
      ]);

      if (!dropResponse.ok || !drawerResponse.ok) {
        const errorText = await dropResponse.text();
        throw new Error(`Server error: ${dropResponse.status} - ${errorText}`);
      }

      const dropData = await dropResponse.json();
      const drawerData = await drawerResponse.json();
      
      setCashDrops(dropData);
      setCashDrawers(drawerData);
      
      const allDates = [...new Set([...dropData.map(d => d.date), ...drawerData.map(d => d.date)])].sort().reverse();
      if (allDates.length > 0) setActiveDate(allDates[0]);
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
      } else {
        setError(err.message);
      }
      console.error('Fetch error:', err);
    }
  };

  const handleWTD = () => {
    const start = getPSTWeekStart();
    const end = getPSTDate();
    setSelectedDateFrom(start);
    setSelectedDateTo(end);
    fetchData(start, end);
  };

  const handleMTD = () => {
    const start = getPSTMonthStart();
    const end = getPSTDate();
    setSelectedDateFrom(start);
    setSelectedDateTo(end);
    fetchData(start, end);
  };

  const handleYTD = () => {
    const start = getPSTYearStart();
    const end = getPSTDate();
    setSelectedDateFrom(start);
    setSelectedDateTo(end);
    fetchData(start, end);
  };

  const uniqueDates = [...new Set([...cashDrops.map(d => d.date), ...cashDrawers.map(d => d.date)])].sort().reverse();

  // Filter cash drops by status (for display)
  const dropsPassStatusFilter = (drop) => {
    if (statusFilter === 'all') return true;
    return drop.status === statusFilter;
  };

  // Build rows for activeDate: pair each drop with its drawer via drawer_entry_id (FK), then add standalone drawers
  const getRowsForActiveDate = () => {
    if (!activeDate) return [];
    const dropsForDate = cashDrops.filter(d => d.date === activeDate).filter(dropsPassStatusFilter);
    const drawersForDate = cashDrawers.filter(d => d.date === activeDate);
    const drawerById = Object.fromEntries(drawersForDate.map(d => [d.id, d]));

    const rows = dropsForDate.map(drop => ({
      drop,
      drawer: drop.drawer_entry_id ? drawerById[drop.drawer_entry_id] || null : null
    }));

    const linkedDrawerIds = new Set(dropsForDate.map(d => d.drawer_entry_id).filter(Boolean));
    const standaloneDrawers = drawersForDate.filter(d => !linkedDrawerIds.has(d.id));
    standaloneDrawers.forEach(drawer => rows.push({ drop: null, drawer }));

    return rows;
  };

  const rowsForActiveDate = getRowsForActiveDate();

  const formatDateTime = (dateStr, submittedAt) => {
    return formatPSTDateTime(dateStr, submittedAt);
  };

  const showStatusMessage = (text, type = 'info') => {
    setStatusMessage({ show: true, text, type });
    setTimeout(() => setStatusMessage({ show: false, text: '', type: 'info' }), 5000);
  };

  const handleIgnoreCashDrop = async () => {
    if (!ignoreModal.reason.trim()) {
      showStatusMessage('Please provide a reason for ignoring this cash drop', 'error');
      return;
    }

    try {
      const token = sessionStorage.getItem('access_token');
      const response = await fetch(API_ENDPOINTS.IGNORE_CASH_DROP, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: ignoreModal.item.id,
          ignore_reason: ignoreModal.reason.trim()
        })
      });

      if (response.ok) {
        showStatusMessage('Cash drop ignored successfully', 'success');
        setIgnoreModal({ show: false, item: null, reason: '' });
        fetchData(selectedDateFrom, selectedDateTo);
      } else {
        const error = await response.json();
        showStatusMessage(error.error || 'Failed to ignore cash drop', 'error');
      }
    } catch (error) {
      console.error('Error ignoring cash drop:', error);
      showStatusMessage('Error ignoring cash drop: ' + error.message, 'error');
    }
  };

  const handleIgnoreDrawer = async () => {
    if (!ignoreDrawerModal.item) return;

    try {
      const token = sessionStorage.getItem('access_token');
      const response = await fetch(API_ENDPOINTS.CASH_DRAWER_BY_ID(ignoreDrawerModal.item.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'ignored' })
      });

      if (response.ok) {
        showStatusMessage('Cash drawer ignored successfully', 'success');
        setIgnoreDrawerModal({ show: false, item: null });
        fetchData(selectedDateFrom, selectedDateTo);
      } else {
        const error = await response.json();
        showStatusMessage(error.error || 'Failed to ignore cash drawer', 'error');
      }
    } catch (error) {
      console.error('Error ignoring cash drawer:', error);
      showStatusMessage('Error ignoring cash drawer: ' + error.message, 'error');
    }
  };

  const handleDeleteDraft = async () => {
    if (!deleteDraftModal.item) return;

    const isDrawer = deleteDraftModal.type === 'drawer';
    const url = isDrawer
      ? API_ENDPOINTS.CASH_DRAWER_BY_ID(deleteDraftModal.item.id)
      : API_ENDPOINTS.DELETE_CASH_DROP(deleteDraftModal.item.id);

    try {
      const token = sessionStorage.getItem('access_token');
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showStatusMessage('Draft deleted successfully.', 'success');
        setDeleteDraftModal({ show: false, item: null, type: 'drop' });
        fetchData(selectedDateFrom, selectedDateTo);
      } else {
        const error = await response.json();
        showStatusMessage(error.error || 'Failed to delete draft.', 'error');
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      showStatusMessage('Error deleting draft: ' + error.message, 'error');
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-2 md:p-4" style={{ fontFamily: 'Calibri, Verdana, sans-serif', fontSize: '14px', color: COLORS.gray }}>
      <div className="max-w-[1400px] mx-auto bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-4 md:p-6 border-b border-gray-200 bg-white">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
            <h2 className="font-bold tracking-tight uppercase" style={{ fontSize: '24px' }}>Cash <span style={{ color: COLORS.magenta }}>Dashboard</span></h2>
            
            <div className="flex flex-wrap items-end gap-2 md:gap-3 p-2 md:p-3 bg-gray-50 rounded-lg border border-gray-200 w-full md:w-auto">
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>From</label>
                <input type="date" value={selectedDateFrom} onChange={e => setSelectedDateFrom(e.target.value)} className="bg-white border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-pink-500" style={{ fontSize: '14px' }} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>To</label>
                <input type="date" value={selectedDateTo} onChange={e => setSelectedDateTo(e.target.value)} className="bg-white border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-pink-500" style={{ fontSize: '14px' }} />
              </div>
              <button onClick={() => fetchData(selectedDateFrom, selectedDateTo)} className="text-white px-4 md:px-5 py-2 rounded font-bold transition-all" style={{ backgroundColor: COLORS.magenta, fontSize: '14px' }}>Fetch Data</button>

            {/*  <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-pink-500 min-w-[120px]"
                  style={{ fontSize: '14px' }}
                >
                  <option value="all">All</option>
                  <option value="drafted">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="ignored">Ignored</option>
                  <option value="reconciled">Reconciled</option>
                  <option value="bank_dropped">Bank Dropped</option>
                </select>
              </div>
            */}              
              <div className="flex gap-1 border-l pl-2 md:pl-3 border-gray-300">
                <button onClick={handleWTD} className="px-2 md:px-3 py-2 bg-white border border-gray-300 rounded font-bold hover:bg-gray-50 transition-colors" style={{ fontSize: '14px' }}>WTD</button>
                <button onClick={handleMTD} className="px-2 md:px-3 py-2 bg-white border border-gray-300 rounded font-bold hover:bg-gray-50 transition-colors" style={{ fontSize: '14px' }}>MTD</button>
                <button onClick={handleYTD} className="px-2 md:px-3 py-2 bg-white border border-gray-300 rounded font-bold hover:bg-gray-50 transition-colors" style={{ fontSize: '14px' }}>YTD</button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row min-h-[700px]">
          
          {/* Left Sidebar: Dates */}
          <div className="w-full md:w-56 bg-gray-50 border-r border-gray-200 p-3 md:p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: COLORS.gray, fontSize: '14px' }}>Date Log</h4>
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {uniqueDates.map(date => (
                <button
                  key={date}
                  onClick={() => setActiveDate(date)}
                  className={`w-full text-left px-3 md:px-4 py-2 md:py-3 rounded font-bold transition-all ${
                    activeDate === date 
                    ? 'text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:border-pink-500 border border-gray-200'
                  }`}
                  style={{ 
                    backgroundColor: activeDate === date ? COLORS.magenta : undefined,
                    fontSize: '14px'
                  }}
                >
                  {formatPSTDateTime(date, null, { month: 'short', day: 'numeric', year: 'numeric' })}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-3 md:p-6 bg-white overflow-x-auto">
            {!activeDate ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 italic" style={{ fontSize: '14px' }}>
                Select a date from the log to view details
              </div>
            ) : (
              <div className="max-w-6xl mx-auto">
                {/* Column Headers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-6">
                  <div className="flex items-center gap-2 border-b-2 pb-2" style={{ borderColor: COLORS.magenta }}>
                    <span className="font-black uppercase tracking-widest" style={{ fontSize: '18px' }}>Cash Drops</span>
                  </div>
                  <div className="flex items-center gap-2 border-b-2 pb-2" style={{ borderColor: COLORS.yellowGreen }}>
                    <span className="font-black uppercase tracking-widest" style={{ fontSize: '18px' }}>Cash Drawers</span>
                  </div>
                </div>

                {/* Data Rows: paired by FK (drop.drawer_entry_id -> drawer.id) */}
                <div className="space-y-4 md:space-y-6">
                  {rowsForActiveDate.map((row, index) => {
                    const drop = row.drop;
                    const drawer = row.drawer;
                    const rowKey = drop ? `drop-${drop.id}` : (drawer ? `drawer-${drawer.id}` : `row-${index}`);

                    return (
                      <div key={rowKey} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-stretch">
                        
                        {/* Drop Card */}
                        <div className="h-full">
                          {drop ? (
                            <div className="h-full flex flex-col p-4 md:p-5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm relative">
                              {/* Status Ribbon */}
                              {drop.status === 'drafted' && (
                                <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-black uppercase tracking-widest transform rotate-12 translate-x-2 -translate-y-1 z-10" style={{ fontSize: '12px' }}>
                                  DRAFT
                                </div>
                              )}
                              {drop.status === 'submitted' && (
                                <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-xs font-black uppercase tracking-widest transform rotate-12 translate-x-2 -translate-y-1 z-10" style={{ fontSize: '12px' }}>
                                  SUBMITTED
                                </div>
                              )}
                              {drop.status === 'ignored' && (
                                <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 text-xs font-black uppercase tracking-widest transform rotate-12 translate-x-2 -translate-y-1 z-10" style={{ fontSize: '12px' }}>
                                  IGNORED
                                </div>
                              )}
                              {drop.status === 'reconciled' && (
                                <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 text-xs font-black uppercase tracking-widest transform rotate-12 translate-x-2 -translate-y-1 z-10" style={{ fontSize: '12px' }}>
                                  RECONCILED
                                </div>
                              )}
                              {drop.status === 'bank_dropped' && (
                                <div className="absolute top-0 right-0 bg-yellow-500 text-white px-3 py-1 text-xs font-black uppercase tracking-widest transform rotate-12 translate-x-2 -translate-y-1 z-10" style={{ fontSize: '12px' }}>
                                  BANK DROPPED
                                </div>
                              )}
                              <div className="flex flex-col md:flex-row justify-between items-start mb-3 md:mb-4 gap-2">
                                <span className="text-xs font-bold px-2 py-0.5 rounded uppercase" style={{ backgroundColor: COLORS.lightPink + '20', color: COLORS.magenta, fontSize: '14px' }}>Shift {drop.shift_number}</span>
                                <span className="text-xl md:text-2xl font-bold tracking-tighter" style={{ color: COLORS.magenta }}>${drop.drop_amount}</span>
                              </div>
                              <div className="text-xs font-bold uppercase mb-2" style={{ color: COLORS.gray, fontSize: '14px' }}>
                                Register: {drop.workstation} | {drop.user_name}
                              </div>
                              {drop.status === 'drafted' && drop.created_at && (
                                <div className="text-xs mb-3 md:mb-4 italic" style={{ color: COLORS.gray, fontSize: '14px' }}>
                                  Saved: {formatDateTime(null, drop.created_at)}
                                </div>
                              )}
                              {drop.submitted_at && (
                                <div className="text-xs mb-3 md:mb-4 italic" style={{ color: COLORS.gray, fontSize: '14px' }}>
                                  Submitted: {formatDateTime(drop.date, drop.submitted_at)} (PST)
                                </div>
                              )}
                              {drop.variance !== undefined && drop.variance !== null && (
                                <div className="mb-3 md:mb-4">
                                  <span className="text-xs font-bold uppercase mr-2" style={{ color: COLORS.gray, fontSize: '14px' }}>Variance:</span>
                                  <span className={`font-bold ${parseFloat(drop.variance) !== 0 ? 'text-red-500' : 'text-gray-400'}`} style={{ fontSize: '14px' }}>
                                    ${parseFloat(drop.variance).toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {drop.notes && (
                                <div className="mb-3 md:mb-4 p-2 bg-white rounded border border-gray-200">
                                  <span className="text-xs font-bold uppercase mr-2" style={{ color: COLORS.gray, fontSize: '14px' }}>Notes:</span>
                                  <span className="text-xs italic" style={{ color: COLORS.gray, fontSize: '14px' }}>{drop.notes}</span>
                                </div>
                              )}
                              {drop.ignore_reason && (
                                <div className="mb-3 md:mb-4 p-2 bg-red-50 rounded border border-red-200">
                                  <span className="text-xs font-bold uppercase mr-2" style={{ color: COLORS.gray, fontSize: '14px' }}>Ignore Reason:</span>
                                  <span className="text-xs italic" style={{ color: COLORS.gray, fontSize: '14px' }}>{drop.ignore_reason}</span>
                                </div>
                              )}
                              {drop.status !== 'drafted' && drop.status !== 'ignored' && drop.status !== 'reconciled' && (
                                <div className="mb-3 md:mb-4">
                                  <button
                                    onClick={() => setIgnoreModal({ show: true, item: drop, reason: '' })}
                                    className="w-full px-3 py-2 text-white font-bold rounded transition-all active:scale-95"
                                    style={{ backgroundColor: COLORS.gray, fontSize: '14px' }}
                                  >
                                    Ignore Cash Drop
                                  </button>
                                </div>
                              )}
                              {drop.status === 'drafted' && (
                                <div className="mb-3 md:mb-4 space-y-2">
                                  {currentUserId == null ? (
                                    <p className="text-xs italic" style={{ color: COLORS.gray, fontSize: '14px' }}>—</p>
                                  ) : Number(drop.user_id) === Number(currentUserId) ? (
                                    <>
                                      <button
                                        onClick={() => navigate(`/cash-drop?draftId=${drop.id}`)}
                                        className="w-full px-3 py-2 text-white font-bold rounded transition-all active:scale-95"
                                        style={{ backgroundColor: COLORS.yellowGreen, fontSize: '14px' }}
                                      >
                                        Edit Draft
                                      </button>
                                      <button
                                        onClick={() => setDeleteDraftModal({ show: true, item: drop, type: 'drop' })}
                                        className="w-full px-3 py-2 text-white font-bold rounded transition-all active:scale-95"
                                        style={{ backgroundColor: '#EF4444', fontSize: '14px' }}
                                      >
                                        Delete Draft
                                      </button>
                                    </>
                                  ) : (
                                    <p className="text-xs italic" style={{ color: COLORS.gray, fontSize: '14px' }}>Another user&apos;s draft</p>
                                  )}
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-gray-200">
                                {DENOMINATION_CONFIG.map(denom => {
                                  const value = drop[denom.name] || 0;
                                  return (
                                    <div key={denom.name} className="flex justify-between text-xs bg-white p-1.5 px-2 rounded border border-gray-100">
                                      <span style={{ color: COLORS.gray, fontSize: '14px' }}>{denom.display}</span>
                                      <span className="font-bold" style={{ fontSize: '14px' }}>{value}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : <div className="h-full bg-gray-50/30 rounded-lg border border-dashed border-gray-200"></div>}
                        </div>

                        {/* Drawer Card */}
                        <div className="h-full">
                          {drawer ? (
                            <div className="h-full flex flex-col p-4 md:p-5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm relative">
                              {/* Status Ribbon - from linked cash drop or drawer's own status (e.g. standalone drawer) */}
                              {(drop && drop.status === 'drafted') || (!drop && drawer.status === 'drafted') ? (
                                <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-black uppercase tracking-widest transform rotate-12 translate-x-2 -translate-y-1 z-10" style={{ fontSize: '12px' }}>DRAFT</div>
                              ) : (drop && drop.status === 'submitted') || (!drop && drawer.status === 'submitted') ? (
                                <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-xs font-black uppercase tracking-widest transform rotate-12 translate-x-2 -translate-y-1 z-10" style={{ fontSize: '12px' }}>SUBMITTED</div>
                              ) : (drop && (drop.status === 'ignored' || drop.ignored)) || drawer.status === 'ignored' ? (
                                <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 text-xs font-black uppercase tracking-widest transform rotate-12 translate-x-2 -translate-y-1 z-10" style={{ fontSize: '12px' }}>IGNORED</div>
                              ) : (drop && drop.status === 'reconciled') ? (
                                <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 text-xs font-black uppercase tracking-widest transform rotate-12 translate-x-2 -translate-y-1 z-10" style={{ fontSize: '12px' }}>RECONCILED</div>
                              ) : (drop && drop.status === 'bank_dropped') ? (
                                <div className="absolute top-0 right-0 bg-yellow-500 text-white px-3 py-1 text-xs font-black uppercase tracking-widest transform rotate-12 translate-x-2 -translate-y-1 z-10" style={{ fontSize: '12px' }}>BANK DROPPED</div>
                              ) : null}
                              <div className="flex flex-col md:flex-row justify-between items-start mb-3 md:mb-4 gap-2">
                                <span className="text-xs font-bold px-2 py-0.5 rounded uppercase" style={{ backgroundColor: COLORS.yellowGreen + '20', color: COLORS.yellowGreen, fontSize: '14px' }}>Register {drawer.workstation}</span>
                                <span className="text-xl md:text-2xl font-bold tracking-tighter" style={{ color: COLORS.yellowGreen }}>${drawer.total_cash}</span>
                              </div>
                              <div className="text-xs font-bold uppercase mb-3 md:mb-4" style={{ color: COLORS.gray, fontSize: '14px' }}>
                                Initial: ${drawer.starting_cash} | {drawer.user_name}
                              </div>
                              {(!drop && drawer.status === 'drafted' && drawer.created_at) && (
                                <div className="text-xs mb-3 md:mb-4 italic" style={{ color: COLORS.gray, fontSize: '14px' }}>
                                  Saved: {formatDateTime(null, drawer.created_at)}
                                </div>
                              )}
                              {((drop && drop.status === 'drafted') || (!drop && drawer.status === 'drafted')) && (
                                <div className="mb-3 md:mb-4 space-y-2">
                                  {currentUserId == null ? (
                                    <p className="text-xs italic" style={{ color: COLORS.gray, fontSize: '14px' }}>—</p>
                                  ) : ((drop && Number(drop.user_id) === Number(currentUserId)) || (!drop && Number(drawer.user_id) === Number(currentUserId))) ? (
                                    <>
                                      <button
                                        onClick={() => navigate(drop ? `/cash-drop?draftId=${drop.id}` : `/cash-drop?draftDrawerId=${drawer.id}`)}
                                        className="w-full px-3 py-2 text-white font-bold rounded transition-all active:scale-95"
                                        style={{ backgroundColor: COLORS.yellowGreen, fontSize: '14px' }}
                                      >
                                        Edit Draft
                                      </button>
                                      <button
                                        onClick={() => setDeleteDraftModal({ show: true, item: drop || drawer, type: drop ? 'drop' : 'drawer' })}
                                        className="w-full px-3 py-2 text-white font-bold rounded transition-all active:scale-95"
                                        style={{ backgroundColor: '#EF4444', fontSize: '14px' }}
                                      >
                                        Delete Draft
                                      </button>
                                    </>
                                  ) : (
                                    <p className="text-xs italic" style={{ color: COLORS.gray, fontSize: '14px' }}>Another user&apos;s draft</p>
                                  )}
                                </div>
                              )}
                              {drawer.status !== 'ignored' && !(drop && drop.status === 'reconciled') && !((drop && drop.status === 'drafted') || (!drop && drawer.status === 'drafted')) && (
                                <div className="mb-3 md:mb-4">
                                  <button
                                    onClick={() => setIgnoreDrawerModal({ show: true, item: drawer })}
                                    className="w-full px-3 py-2 text-white font-bold rounded transition-all active:scale-95"
                                    style={{ backgroundColor: COLORS.gray, fontSize: '14px' }}
                                  >
                                    Ignore Drawer
                                  </button>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-gray-200">
                                {DENOMINATION_CONFIG.map(denom => {
                                  const value = drawer[denom.name] || 0;
                                  return (
                                    <div key={denom.name} className="flex justify-between text-xs bg-white p-1.5 px-2 rounded border border-gray-100">
                                      <span style={{ color: COLORS.gray, fontSize: '14px' }}>{denom.display}</span>
                                      <span className="font-bold" style={{ fontSize: '14px' }}>{value}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : <div className="h-full bg-gray-50/30 rounded-lg border border-dashed border-gray-200"></div>}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Status Message */}
      {statusMessage.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          statusMessage.type === 'error' ? 'bg-red-100 border-l-4 border-red-500' : 
          statusMessage.type === 'success' ? 'bg-green-100 border-l-4 border-green-500' : 
          'bg-blue-100 border-l-4 border-blue-500'
        }`} style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>
          <p className={`font-bold ${statusMessage.type === 'error' ? 'text-red-700' : statusMessage.type === 'success' ? 'text-green-700' : 'text-blue-700'}`} style={{ fontSize: '14px' }}>
            {statusMessage.text}
          </p>
        </div>
      )}

      {/* Ignore Modal */}
      {ignoreModal.show && ignoreModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="relative max-w-md w-full bg-white rounded-lg shadow-2xl overflow-hidden" style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>
            <div className="p-4 text-white font-black uppercase tracking-widest" style={{ backgroundColor: COLORS.magenta, fontSize: '18px' }}>
              Ignore Cash Drop
            </div>
            <div className="p-6">
              <p className="mb-4 font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>
                Please provide a reason for ignoring this cash drop:
              </p>
              <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between mb-2">
                  <span className="font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>Date:</span>
                  <span style={{ color: COLORS.gray, fontSize: '14px' }}>{ignoreModal.item.date}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>Register:</span>
                  <span style={{ color: COLORS.magenta, fontSize: '14px' }}>{ignoreModal.item.workstation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>Amount:</span>
                  <span style={{ color: COLORS.yellowGreen, fontSize: '14px' }}>${ignoreModal.item.drop_amount}</span>
                </div>
              </div>
              <textarea
                value={ignoreModal.reason}
                onChange={(e) => setIgnoreModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter reason for ignoring this cash drop..."
                rows="4"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-500 outline-none mb-4"
                style={{ fontSize: '14px', color: COLORS.gray }}
              />
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleIgnoreCashDrop}
                  className="px-6 py-2 rounded-lg text-white font-black transition-all active:scale-95"
                  style={{ backgroundColor: COLORS.magenta, fontSize: '14px' }}
                >
                  Confirm Ignore
                </button>
                <button
                  onClick={() => setIgnoreModal({ show: false, item: null, reason: '' })}
                  className="px-6 py-2 rounded-lg text-white font-black transition-all active:scale-95"
                  style={{ backgroundColor: COLORS.gray, fontSize: '14px' }}
                >
                  Cancel
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Ignore Drawer Modal */}
        {ignoreDrawerModal.show && ignoreDrawerModal.item && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
            <div className="relative max-w-md w-full bg-white rounded-lg shadow-2xl overflow-hidden" style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>
              <div className="p-4 text-white font-black uppercase tracking-widest" style={{ backgroundColor: COLORS.magenta, fontSize: '18px' }}>
                Ignore Cash Drawer
              </div>
              <div className="p-6">
                <p className="mb-4 font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>
                  Are you sure you want to ignore this cash drawer? The drawer and any linked cash drop will be set to ignored.
                </p>
                <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>Date:</span>
                    <span style={{ color: COLORS.gray, fontSize: '14px' }}>{ignoreDrawerModal.item.date}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>Register:</span>
                    <span style={{ color: COLORS.magenta, fontSize: '14px' }}>{ignoreDrawerModal.item.workstation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>Total Cash:</span>
                    <span style={{ color: COLORS.yellowGreen, fontSize: '14px' }}>${ignoreDrawerModal.item.total_cash}</span>
                  </div>
                </div>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleIgnoreDrawer}
                    className="px-6 py-2 rounded-lg text-white font-black transition-all active:scale-95"
                    style={{ backgroundColor: COLORS.magenta, fontSize: '14px' }}
                  >
                    Confirm Ignore
                  </button>
                  <button
                    onClick={() => setIgnoreDrawerModal({ show: false, item: null })}
                    className="px-6 py-2 rounded-lg text-white font-black transition-all active:scale-95"
                    style={{ backgroundColor: COLORS.gray, fontSize: '14px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Draft Modal */}
        {deleteDraftModal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.magenta, fontSize: '18px' }}>Delete Draft</h3>
              <p className="mb-4" style={{ fontSize: '14px', color: COLORS.gray }}>
                {deleteDraftModal.type === 'drawer'
                  ? 'This will delete the drawer draft and the linked cash drop draft. This action cannot be undone.'
                  : 'This will delete the cash drop draft and the linked drawer draft. This action cannot be undone.'}
              </p>
              {deleteDraftModal.item && (
                <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>Date:</span>
                    <span style={{ color: COLORS.gray, fontSize: '14px' }}>{deleteDraftModal.item.date}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>Register:</span>
                    <span style={{ color: COLORS.magenta, fontSize: '14px' }}>{deleteDraftModal.item.workstation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>Amount:</span>
                    <span style={{ color: COLORS.yellowGreen, fontSize: '14px' }}>
                      ${deleteDraftModal.type === 'drawer' ? deleteDraftModal.item.total_cash : deleteDraftModal.item.drop_amount}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleDeleteDraft}
                  className="px-6 py-2 rounded-lg text-white font-black transition-all active:scale-95"
                  style={{ backgroundColor: '#EF4444', fontSize: '14px' }}
                >
                  Delete Draft
                </button>
                <button
                  onClick={() => setDeleteDraftModal({ show: false, item: null, type: 'drop' })}
                  className="px-6 py-2 rounded-lg text-white font-black transition-all active:scale-95"
                  style={{ backgroundColor: COLORS.gray, fontSize: '14px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
}

export default CdDashboard;
