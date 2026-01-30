import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';

function CashDrop() {
  const navigate = useNavigate();
  
  // Color constants
  const COLORS = {
    magenta: '#AA056C',
    yellowGreen: '#C4CB07',
    lightPink: '#F46690',
    gray: '#64748B'
  };
  
  // --- STATE ---
  const [formData, setFormData] = useState({
    employeeName: '',
    shiftNumber: '',
    workStation: '',
    date: new Date().toISOString().slice(0, 10),
    startingCash: '200.00',
    cashReceivedOnReceipt: 0,
    pennies: 0, nickels: 0, dimes: 0, quarters: 0, halfDollars: 0,
    ones: 0, twos: 0, fives: 0, tens: 0, twenties: 0, fifties: 0, hundreds: 0,
    notes: ''
  });

  const [labelImage, setLabelImage] = useState(null);
  const [cashDropDenominations, setCashDropDenominations] = useState(null);
  const [remainingCashInDrawer, setRemainingCashInDrawer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ show: false, text: '', type: 'info' });
  
  const DENOMINATION_CONFIG = [
    { name: 'Hundreds', value: 100, field: 'hundreds', display: 'Hundreds ($100)' },
    { name: 'Fifties', value: 50, field: 'fifties', display: 'Fifties ($50)' },
    { name: 'Twenties', value: 20, field: 'twenties', display: 'Twenties ($20)' },
    { name: 'Tens', value: 10, field: 'tens', display: 'Tens ($10)' },
    { name: 'Fives', value: 5, field: 'fives', display: 'Fives ($5)' },
    { name: 'Twos', value: 2, field: 'twos', display: 'Twos ($2)' },
    { name: 'Ones', value: 1, field: 'ones', display: 'Ones ($1)' },
    { name: 'Half Dollars', value: 0.50, field: 'halfDollars', display: 'Half Dollars ($0.50)' },
    { name: 'Quarters', value: 0.25, field: 'quarters', display: 'Quarters ($0.25)' },
    { name: 'Dimes', value: 0.10, field: 'dimes', display: 'Dimes ($0.10)' },
    { name: 'Nickels', value: 0.05, field: 'nickels', display: 'Nickels ($0.05)' },
    { name: 'Pennies', value: 0.01, field: 'pennies', display: 'Pennies ($0.01)' },
  ];

  // --- EFFECTS ---
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.CURRENT_USER, {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('access_token')}` },
        });
        if (!response.ok) throw new Error('Auth failed');
        const data = await response.json();
        setFormData(prev => ({ ...prev, employeeName: data.name }));
        setIsAdmin(data.is_admin);
        setLoading(false);
      } catch (err) { navigate('/login'); }
    };
    fetchUser();
  }, [navigate]);

  useEffect(() => {
    calculateDenominations();
  }, [formData]);

  // --- HELPERS ---
  const showStatusMessage = (text, type = 'info') => {
    setStatusMessage({ show: true, text, type });
    setTimeout(() => setStatusMessage({ show: false, text: '', type: 'info' }), 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Prevent selecting prior day's dates
    if (name === 'date') {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        showStatusMessage('Cannot select prior dates. Cash drop is for immediate shift/day closure.', 'error');
        return;
      }
    }
    
    // Parse numeric values for numeric fields (except cashReceivedOnReceipt which should remain as text to allow decimals)
    const numericFields = ['startingCash', 'pennies', 'nickels', 'dimes', 'quarters', 'halfDollars', 'ones', 'twos', 'fives', 'tens', 'twenties', 'fifties', 'hundreds'];
    if (numericFields.includes(name)) {
      const numValue = parseFloat(value) || 0;
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      // For cashReceivedOnReceipt and other text fields, keep as string to allow decimal input
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const calculateTotalCash = () => DENOMINATION_CONFIG.reduce((acc, d) => acc + (formData[d.field] * d.value), 0).toFixed(2);
  const calculateDropAmount = () => (parseFloat(calculateTotalCash()) - parseFloat(formData.startingCash)).toFixed(2);
  const calculateVariance = () => (parseFloat(calculateDropAmount()) - parseFloat(formData.cashReceivedOnReceipt || 0)).toFixed(2);

  const calculateDenominations = () => {
    const amountToDrop = parseFloat(calculateDropAmount());
    if (amountToDrop <= 0) { setCashDropDenominations(null); return; }

    let remaining = Math.round(amountToDrop * 100);
    const dropBreakdown = {};
    const finalDrawer = {};

    DENOMINATION_CONFIG.forEach(denom => {
      const valCents = Math.round(denom.value * 100);
      const available = formData[denom.field];
      let count = 0;
      if (valCents > 0 && remaining >= valCents) {
        count = Math.min(Math.floor(remaining / valCents), available);
        remaining -= count * valCents;
      }
      dropBreakdown[denom.field] = count;
      finalDrawer[denom.field] = available - count;
    });

    setCashDropDenominations(dropBreakdown);
    setRemainingCashInDrawer(finalDrawer);
  };

  const isSubmitValid = () => {
    const drop = parseFloat(calculateDropAmount());
    const mathCheck = Math.abs(drop - (parseFloat(calculateTotalCash()) - parseFloat(formData.startingCash))) < 0.01;
    return mathCheck && drop > 0 && formData.workStation;
  };

  const handleSubmit = async () => {
    const token = sessionStorage.getItem('access_token');
    try {
      // 1. Save Drawer
      const drawerData = {
        workstation: formData.workStation,
        shift_number: formData.shiftNumber,
        date: formData.date,
        starting_cash: parseFloat(formData.startingCash),
        total_cash: parseFloat(calculateTotalCash()),
        ...Object.fromEntries(DENOMINATION_CONFIG.map(d => [d.field === 'halfDollars' ? 'half_dollars' : d.field, formData[d.field]]))
      };

      const dRes = await fetch(API_ENDPOINTS.CASH_DRAWER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(drawerData),
      });

      if (!dRes.ok) throw new Error('Failed to save Drawer data.');
      const dResult = await dRes.json();

      // 2. Save Drop with Image
      const dropForm = new FormData();
      dropForm.append('drawer_entry', dResult.id);
      dropForm.append('workstation', formData.workStation);
      dropForm.append('shift_number', formData.shiftNumber);
      dropForm.append('date', formData.date);
      dropForm.append('drop_amount', calculateDropAmount());
      dropForm.append('ws_label_amount', formData.cashReceivedOnReceipt);
      dropForm.append('cashReceivedOnReceipt', formData.cashReceivedOnReceipt);
      dropForm.append('variance', calculateVariance());
      if (formData.notes) dropForm.append('notes', formData.notes);
      if (labelImage) dropForm.append('label_image', labelImage);

      Object.keys(cashDropDenominations).forEach(key => {
        const backendKey = key === 'halfDollars' ? 'half_dollars' : key;
        dropForm.append(backendKey, cashDropDenominations[key]);
      });

      const dropRes = await fetch(API_ENDPOINTS.CASH_DROP, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: dropForm,
      });

      if (!dropRes.ok) throw new Error('Failed to save Cash Drop & Image.');
      
      showStatusMessage('Cash Drop finalized successfully!', 'success');
      setTimeout(() => navigate('/cd-dashboard'), 2000);

    } catch (err) {
      showStatusMessage(err.message, 'error');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center" style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>Initializing Terminal...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-6" style={{ fontFamily: 'Calibri, Verdana, sans-serif', fontSize: '14px', color: COLORS.gray }}>
      
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

      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4" style={{ backgroundColor: COLORS.magenta }}>
          <h2 className="text-white font-black tracking-widest text-center uppercase" style={{ fontSize: '24px' }}>CashDrop Terminal</h2>
        </div>

        <div className="p-4 md:p-8">
          {/* Section 1: Top Bar Details - Split into two divs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8 p-4 bg-gray-50 rounded-lg">
            {/* Left Div: Input Fields */}
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Shift Number</label>
                <input type="text" name="shiftNumber" value={formData.shiftNumber} onChange={handleChange} className="p-2 bg-white border-b border-gray-300 focus:border-pink-600 outline-none" style={{ fontSize: '14px' }} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Register Number</label>
                <input type="text" name="workStation" value={formData.workStation} onChange={handleChange} className="p-2 bg-white border-b border-gray-300 focus:border-pink-600 outline-none" style={{ fontSize: '14px' }} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Starting Cash</label>
                <input type="text" name="startingCash" value={formData.startingCash} readOnly={!isAdmin} onChange={handleChange} className="p-2 bg-white border-b border-gray-300 font-bold" style={{ fontSize: '14px', color: COLORS.magenta }} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.magenta, fontSize: '14px' }}>Cash Received on Receipt</label>
                <input type="text" name="cashReceivedOnReceipt" value={formData.cashReceivedOnReceipt} onChange={handleChange} className="p-2 bg-white border-b border-gray-300 font-bold focus:border-pink-600 outline-none" style={{ fontSize: '14px', color: COLORS.magenta }} />
              </div>
            </div>
            
            {/* Right Div: Display Only Fields */}
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Employee</label>
                <div className="p-2 bg-transparent border-b border-gray-300 font-bold" style={{ fontSize: '14px', color: COLORS.gray }}>{formData.employeeName}</div>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} max={new Date().toISOString().slice(0, 10)} className="p-2 bg-white border-b border-gray-300 font-bold focus:border-pink-600 outline-none" style={{ fontSize: '14px', color: COLORS.gray }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 items-start">
            {/* Input Column */}
            <div className="bg-white border rounded-lg p-4 md:p-6">
              <h3 className="font-black uppercase mb-4 md:mb-6 tracking-widest border-b pb-2" style={{ fontSize: '18px', color: COLORS.gray }}>1. Register Cash Count</h3>
              <div className="space-y-3">
                {DENOMINATION_CONFIG.map(d => (
                  <div key={d.field} className="flex justify-between items-center">
                    <span className="text-xs font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>{d.display}</span>
                    <input type="text" name={d.field} value={formData[d.field]} onChange={handleChange} className="w-20 p-1 border rounded text-right" style={{ fontSize: '14px' }} />
                  </div>
                ))}
              </div>
              <div className="mt-6 md:mt-8 pt-4 border-t space-y-2">
                <div className="flex justify-between" style={{ fontSize: '14px' }}><span>Drawer Total:</span> <span className="font-bold">${calculateTotalCash()}</span></div>
              </div>
            </div>

            {/* Auto Drop Column */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 md:p-6">
              <h3 className="font-black uppercase mb-4 md:mb-6 tracking-widest border-b border-blue-100 pb-2" style={{ fontSize: '18px', color: COLORS.magenta }}>2. Suggested Cash Drop</h3>
              <div className="space-y-2">
                {cashDropDenominations ? DENOMINATION_CONFIG.map(d => cashDropDenominations[d.field] > 0 && (
                  <div key={d.field} className="flex justify-between p-2 bg-white rounded border border-blue-50">
                    <span className="text-xs font-bold uppercase" style={{ color: COLORS.gray, fontSize: '14px' }}>{d.display}</span>
                    <span className="font-black" style={{ color: COLORS.magenta, fontSize: '14px' }}>x {cashDropDenominations[d.field]}</span>
                  </div>
                )) : <p className="text-center text-gray-300 py-20 italic" style={{ fontSize: '14px' }}>Enter amounts to calculate...</p>}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between" style={{ color: COLORS.yellowGreen, fontSize: '14px' }}>
                    <span>Net Drop:</span> 
                    <span className="font-black">${calculateDropAmount()}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: COLORS.lightPink, fontSize: '14px' }}>
                    <span>Variance:</span> 
                    <span className="font-black">${calculateVariance()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Image & Submit Column */}
            <div className="space-y-4 md:space-y-6">
              <div className="bg-white border rounded-lg p-4 md:p-6">
                <h3 className="font-black uppercase mb-4 md:mb-6 tracking-widest border-b pb-2" style={{ fontSize: '18px', color: COLORS.gray }}>3. Cash Drop Receipt (Optional)</h3>
                <label className={`group flex flex-col items-center justify-center w-full h-32 md:h-40 border-2 border-dashed rounded-lg cursor-pointer transition-all ${labelImage ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-pink-500'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <p className="font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>{labelImage ? "✅ Image Ready" : "Upload Cash Drop Receipt (Optional)"}</p>
                    <p className="mt-1" style={{ color: COLORS.gray, fontSize: '14px' }}>{labelImage ? labelImage.name : "PNG, JPG or JPEG"}</p>
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setLabelImage(e.target.files[0])} accept="image/*" />
                </label>
              </div>

              {/* Notes/Comments Field */}
              <div className="bg-white border rounded-lg p-4 md:p-6">
                <h3 className="font-black uppercase mb-4 tracking-widest border-b pb-2" style={{ fontSize: '18px', color: COLORS.gray }}>Notes/Comments</h3>
                <textarea 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="4"
                  className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-pink-500 outline-none"
                  placeholder="Enter any notes or comments about this cash drop..."
                  style={{ fontSize: '14px' }}
                />
              </div>

              {isSubmitValid() ? (
                <button onClick={handleSubmit} className="w-full py-3 md:py-4 text-white font-black rounded-lg shadow-lg transform transition active:scale-95 uppercase tracking-widest" style={{ backgroundColor: COLORS.magenta, fontSize: '18px' }}>
                  Finalize Cash Drop
                </button>
              ) : (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                  <p className="font-black text-red-500 leading-relaxed" style={{ fontSize: '14px' }}>
                    {parseFloat(calculateDropAmount()) <= 0 && "• Drop Amount must be positive"}<br/>
                    {formData.workStation === '' && "• Register Number is required"}<br/>
                    {formData.shiftNumber === '' && "• Shift Number is required"}<br/>
                    {formData.startingCash === '' && "• Starting Cash is required"}<br/>
                    {formData.cashReceivedOnReceipt === '' && "• Cash Received on Receipt is required"}<br/>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CashDrop;
