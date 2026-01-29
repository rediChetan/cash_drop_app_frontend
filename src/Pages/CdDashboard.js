import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';

function CdDashboard() {
  const navigate = useNavigate();
  const [selectedDateFrom, setSelectedDateFrom] = useState(new Date().toISOString().slice(0, 10));
  const [selectedDateTo, setSelectedDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [cashDrops, setCashDrops] = useState([]);
  const [cashDrawers, setCashDrawers] = useState([]);
  const [activeDate, setActiveDate] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const COLORS = {
    magenta: '#AA056C',
    yellowGreen: '#C4CB07',
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
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
    const start = new Date(now.setDate(diff)).toISOString().slice(0, 10);
    const end = new Date().toISOString().slice(0, 10);
    setSelectedDateFrom(start);
    setSelectedDateTo(end);
    fetchData(start, end);
  };

  const handleMTD = () => {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date().toISOString().slice(0, 10);
    setSelectedDateFrom(start);
    setSelectedDateTo(end);
    fetchData(start, end);
  };

  const handleYTD = () => {
    const start = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
    const end = new Date().toISOString().slice(0, 10);
    setSelectedDateFrom(start);
    setSelectedDateTo(end);
    fetchData(start, end);
  };

  const uniqueDates = [...new Set([...cashDrops.map(d => d.date), ...cashDrawers.map(d => d.date)])].sort().reverse();

  // Helper to group records by index to ensure horizontal row alignment
  const maxRows = Math.max(
    cashDrops.filter(d => d.date === activeDate).length,
    cashDrawers.filter(d => d.date === activeDate).length
  );

  const formatDateTime = (dateStr, submittedAt) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    let formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (submittedAt) {
      const submitted = new Date(submittedAt);
      formatted += ` at ${submitted.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    }
    return formatted;
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4" style={{ fontFamily: 'Calibri, Verdana, sans-serif', fontSize: '12px', color: COLORS.gray }}>
      <div className="max-w-[1400px] mx-auto bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <h2 className="font-bold tracking-tight uppercase" style={{ fontSize: '24px' }}>Cash <span style={{ color: COLORS.magenta }}>Dashboard</span></h2>
            
            <div className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase mb-1" style={{ color: COLORS.gray }}>From</label>
                <input type="date" value={selectedDateFrom} onChange={e => setSelectedDateFrom(e.target.value)} className="bg-white border border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-pink-500" style={{ fontSize: '12px' }} />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase mb-1" style={{ color: COLORS.gray }}>To</label>
                <input type="date" value={selectedDateTo} onChange={e => setSelectedDateTo(e.target.value)} className="bg-white border border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-pink-500" style={{ fontSize: '12px' }} />
              </div>
              <button onClick={() => fetchData(selectedDateFrom, selectedDateTo)} className="text-white px-5 py-2 rounded font-bold text-xs transition-all" style={{ backgroundColor: COLORS.magenta, fontSize: '12px' }}>Fetch Data</button>
              
              <div className="flex gap-1 border-l pl-3 border-gray-300">
                <button onClick={handleWTD} className="px-3 py-2 bg-white border border-gray-300 rounded text-[10px] font-bold hover:bg-gray-50 transition-colors" style={{ fontSize: '12px' }}>WTD</button>
                <button onClick={handleMTD} className="px-3 py-2 bg-white border border-gray-300 rounded text-[10px] font-bold hover:bg-gray-50 transition-colors" style={{ fontSize: '12px' }}>MTD</button>
                <button onClick={handleYTD} className="px-3 py-2 bg-white border border-gray-300 rounded text-[10px] font-bold hover:bg-gray-50 transition-colors" style={{ fontSize: '12px' }}>YTD</button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row min-h-[700px]">
          
          {/* Left Sidebar: Dates */}
          <div className="w-full md:w-56 bg-gray-50 border-r border-gray-200 p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: COLORS.gray }}>Date Log</h4>
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {uniqueDates.map(date => (
                <button
                  key={date}
                  onClick={() => setActiveDate(date)}
                  className={`w-full text-left px-4 py-3 rounded text-xs font-bold transition-all ${
                    activeDate === date 
                    ? 'text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:border-pink-500 border border-gray-200'
                  }`}
                  style={{ 
                    backgroundColor: activeDate === date ? COLORS.magenta : undefined,
                    fontSize: '12px'
                  }}
                >
                  {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 bg-white">
            {!activeDate ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 italic text-sm">
                Select a date from the log to view details
              </div>
            ) : (
              <div className="max-w-6xl mx-auto">
                {/* Column Headers */}
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div className="flex items-center gap-2 border-b-2 pb-2" style={{ borderColor: COLORS.magenta }}>
                    <span className="text-sm font-black uppercase tracking-widest" style={{ fontSize: '18px' }}>Cash Drops</span>
                  </div>
                  <div className="flex items-center gap-2 border-b-2 pb-2" style={{ borderColor: COLORS.yellowGreen }}>
                    <span className="text-sm font-black uppercase tracking-widest" style={{ fontSize: '18px' }}>Cash Drawers</span>
                  </div>
                </div>

                {/* Data Rows: This logic ensures horizontal alignment */}
                <div className="space-y-6">
                  {[...Array(maxRows)].map((_, index) => {
                    const drop = cashDrops.filter(d => d.date === activeDate)[index];
                    const drawer = cashDrawers.filter(d => d.date === activeDate)[index];

                    return (
                      <div key={index} className="grid grid-cols-2 gap-8 items-stretch">
                        
                        {/* Drop Card */}
                        <div className="h-full">
                          {drop ? (
                            <div className="h-full flex flex-col p-5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                              <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ backgroundColor: COLORS.lightPink + '20', color: COLORS.magenta }}>Shift {drop.shift_number}</span>
                                <span className="text-2xl font-bold tracking-tighter" style={{ color: COLORS.magenta }}>${drop.drop_amount}</span>
                              </div>
                              <div className="text-[10px] font-bold uppercase mb-2" style={{ color: COLORS.gray }}>
                                Register: {drop.workstation} | {drop.user_name}
                              </div>
                              {drop.submitted_at && (
                                <div className="text-[9px] mb-4 italic" style={{ color: COLORS.gray }}>
                                  Submitted: {formatDateTime(drop.date, drop.submitted_at)}
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-gray-200">
                                {DENOMINATION_CONFIG.map(denom => {
                                  const value = drop[denom.name] || 0;
                                  return (
                                    <div key={denom.name} className="flex justify-between text-[10px] bg-white p-1.5 px-2 rounded border border-gray-100">
                                      <span style={{ color: COLORS.gray }}>{denom.display}</span>
                                      <span className="font-bold">{value}</span>
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
                            <div className="h-full flex flex-col p-5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                              <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ backgroundColor: COLORS.yellowGreen + '20', color: COLORS.yellowGreen }}>Register {drawer.workstation}</span>
                                <span className="text-2xl font-bold tracking-tighter" style={{ color: COLORS.yellowGreen }}>${drawer.total_cash}</span>
                              </div>
                              <div className="text-[10px] font-bold uppercase mb-4" style={{ color: COLORS.gray }}>
                                Initial: ${drawer.starting_cash} | {drawer.user_name}
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-gray-200">
                                {DENOMINATION_CONFIG.map(denom => {
                                  const value = drawer[denom.name] || 0;
                                  return (
                                    <div key={denom.name} className="flex justify-between text-[10px] bg-white p-1.5 px-2 rounded border border-gray-100">
                                      <span style={{ color: COLORS.gray }}>{denom.display}</span>
                                      <span className="font-bold">{value}</span>
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
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
}

export default CdDashboard;
