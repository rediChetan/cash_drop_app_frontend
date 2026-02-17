import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import { getPSTDate, isAllowedCashDropDate } from '../utils/dateUtils';

function CashDrop() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Set page title
  useEffect(() => {
    document.title = 'Cash Drop';
  }, []);
  
  // Color constants
  const COLORS = {
    magenta: '#AA056C',
    yellowGreen: '#22C55E',
    lightPink: '#F46690',
    gray: '#64748B'
  };
  
  // --- STATE ---
  const [formData, setFormData] = useState({
    employeeName: '',
    shiftNumber: '',
    workStation: '',
    date: getPSTDate(),
    startingCash: '200.00',
    cashReceivedOnReceipt: '',
    pennies: 0, nickels: 0, dimes: 0, quarters: 0, halfDollars: 0,
    ones: 0, twos: 0, fives: 0, tens: 0, twenties: 0, fifties: 0, hundreds: 0,
    notes: ''
  });

  const [labelImage, setLabelImage] = useState(null);
  const [labelImageUrl, setLabelImageUrl] = useState(null); // For displaying existing images
  const [cashDropDenominations, setCashDropDenominations] = useState(null);
  const [remainingCashInDrawer, setRemainingCashInDrawer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ show: false, text: '', type: 'info' });
  const [adminSettings, setAdminSettings] = useState({ shifts: [], workstations: [], starting_amount: 200.00, max_cash_drops_per_day: 10 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [draftDrawerId, setDraftDrawerId] = useState(null);
  
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
    
    // Fetch admin settings
    const fetchSettings = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.ADMIN_SETTINGS);
        if (response.ok) {
          const data = await response.json();
          setAdminSettings(data);
          setFormData(prev => ({ ...prev, startingCash: data.starting_amount.toString() }));
        }
      } catch (error) {
        console.error("Error fetching admin settings:", error);
      }
    };
      fetchSettings();
    
    // Load draft ONLY if draftId is provided in URL query params (from Edit Draft button)
    const loadDraft = async () => {
      try {
        const token = sessionStorage.getItem('access_token');
        if (!token) return;
        
        // Check if draftId or draftDrawerId is in URL query params (from Edit Draft button)
        const queryParams = new URLSearchParams(location.search);
        const draftIdFromUrl = queryParams.get('draftId');
        const draftDrawerIdFromUrl = queryParams.get('draftDrawerId');
        
        if (draftDrawerIdFromUrl && !draftIdFromUrl) {
          // Load standalone drawer draft
          const drawerResponse = await fetch(API_ENDPOINTS.CASH_DRAWER_BY_ID(draftDrawerIdFromUrl), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!drawerResponse.ok) {
            showStatusMessage('Drawer draft not found.', 'error');
            return;
          }
          const drawerDraft = await drawerResponse.json();
          if (drawerDraft.status !== 'drafted') {
            showStatusMessage('This drawer is not a draft.', 'error');
            return;
          }
          setDraftDrawerId(drawerDraft.id);
          setDraftId(null);
          let formattedDate = (drawerDraft.date && typeof drawerDraft.date === 'string') ? drawerDraft.date.split('T')[0] : getPSTDate();
          setFormData(prev => ({
            ...prev,
            shiftNumber: drawerDraft.shift_number || '',
            workStation: drawerDraft.workstation || '',
            date: formattedDate,
            startingCash: drawerDraft.starting_cash != null ? String(drawerDraft.starting_cash) : prev.startingCash,
            hundreds: drawerDraft.hundreds || 0,
            fifties: drawerDraft.fifties || 0,
            twenties: drawerDraft.twenties || 0,
            tens: drawerDraft.tens || 0,
            fives: drawerDraft.fives || 0,
            twos: drawerDraft.twos || 0,
            ones: drawerDraft.ones || 0,
            halfDollars: drawerDraft.half_dollars || 0,
            quarters: drawerDraft.quarters || 0,
            dimes: drawerDraft.dimes || 0,
            nickels: drawerDraft.nickels || 0,
            pennies: drawerDraft.pennies || 0,
            quarterRolls: drawerDraft.quarter_rolls || 0,
            dimeRolls: drawerDraft.dime_rolls || 0,
            nickelRolls: drawerDraft.nickel_rolls || 0,
            pennyRolls: drawerDraft.penny_rolls || 0
          }));
          showStatusMessage('Retrieved drawer draft for editing.', 'info');
          return;
        }
        
        if (!draftIdFromUrl) {
          setDraftId(null);
          setDraftDrawerId(null);
          return;
        }
        
        // Fetch the specific drop draft by ID
        const dropResponse = await fetch(API_ENDPOINTS.CASH_DROP_BY_ID(draftIdFromUrl), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!dropResponse.ok) {
          const errorData = await dropResponse.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Error fetching draft:', dropResponse.status, errorData);
          showStatusMessage(errorData.error || `Draft not found (Status: ${dropResponse.status})`, 'error');
          return;
        }
        
        const draft = await dropResponse.json();
        
        // Verify it's a draft and belongs to current user
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const currentUserId = tokenData.id;
        
        if (draft.status !== 'drafted' || draft.user_id !== currentUserId) {
          showStatusMessage('Invalid draft or access denied.', 'error');
          return;
        }
        
        setDraftId(draft.id);
        
        // Fetch corresponding drawer
        let drawerDraft = null;
        if (draft.drawer_entry_id) {
          const drawerResponse = await fetch(API_ENDPOINTS.CASH_DRAWER_BY_ID(draft.drawer_entry_id), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (drawerResponse.ok) {
            drawerDraft = await drawerResponse.json();
            setDraftDrawerId(drawerDraft.id);
          } else {
            console.warn('Drawer not found for draft:', draft.drawer_entry_id);
          }
        } else {
          // If no drawer_entry_id, try to find drawer by matching workstation/shift/date
          const today = getPSTDate();
          const drawerResponse = await fetch(`${API_ENDPOINTS.CASH_DRAWER}?datefrom=${draft.date || today}&dateto=${draft.date || today}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (drawerResponse.ok) {
            const drawers = await drawerResponse.json();
            drawerDraft = drawers.find(d => 
              d.workstation === draft.workstation && 
              d.shift_number === draft.shift_number && 
              d.date === draft.date &&
              d.status === 'drafted'
            );
            if (drawerDraft) {
              setDraftDrawerId(drawerDraft.id);
            }
          }
        }
        
        // Load cash drawer denominations (from drawer) and ws_label_amount (from cash drop)
        // Format date properly for HTML date input (YYYY-MM-DD)
        let formattedDate = getPSTDate();
        if (draft.date) {
          if (typeof draft.date === 'string') {
            // If it's a date string, extract YYYY-MM-DD part
            formattedDate = draft.date.split('T')[0];
          } else {
            formattedDate = getPSTDate();
          }
        }
        
        setFormData(prev => ({
          ...prev,
          shiftNumber: draft.shift_number || '',
          workStation: draft.workstation || '',
          date: formattedDate,
          cashReceivedOnReceipt: draft.ws_label_amount !== null && draft.ws_label_amount !== undefined
            ? (draft.ws_label_amount === 0 ? '0' : String(draft.ws_label_amount))
            : '',
          notes: draft.notes || '',
          // Denominations from cash drawer
          hundreds: drawerDraft ? (drawerDraft.hundreds && drawerDraft.hundreds !== 0 ? drawerDraft.hundreds : '') : '',
          fifties: drawerDraft ? (drawerDraft.fifties && drawerDraft.fifties !== 0 ? drawerDraft.fifties : '') : '',
          twenties: drawerDraft ? (drawerDraft.twenties && drawerDraft.twenties !== 0 ? drawerDraft.twenties : '') : '',
          tens: drawerDraft ? (drawerDraft.tens && drawerDraft.tens !== 0 ? drawerDraft.tens : '') : '',
          fives: drawerDraft ? (drawerDraft.fives && drawerDraft.fives !== 0 ? drawerDraft.fives : '') : '',
          twos: drawerDraft ? (drawerDraft.twos && drawerDraft.twos !== 0 ? drawerDraft.twos : '') : '',
          ones: drawerDraft ? (drawerDraft.ones && drawerDraft.ones !== 0 ? drawerDraft.ones : '') : '',
          halfDollars: drawerDraft ? (drawerDraft.half_dollars && drawerDraft.half_dollars !== 0 ? drawerDraft.half_dollars : '') : '',
          quarters: drawerDraft ? (drawerDraft.quarters && drawerDraft.quarters !== 0 ? drawerDraft.quarters : '') : '',
          dimes: drawerDraft ? (drawerDraft.dimes && drawerDraft.dimes !== 0 ? drawerDraft.dimes : '') : '',
          nickels: drawerDraft ? (drawerDraft.nickels && drawerDraft.nickels !== 0 ? drawerDraft.nickels : '') : '',
          pennies: drawerDraft ? (drawerDraft.pennies && drawerDraft.pennies !== 0 ? drawerDraft.pennies : '') : '',
          quarterRolls: drawerDraft ? (drawerDraft.quarter_rolls && drawerDraft.quarter_rolls !== 0 ? drawerDraft.quarter_rolls : '') : '',
          dimeRolls: drawerDraft ? (drawerDraft.dime_rolls && drawerDraft.dime_rolls !== 0 ? drawerDraft.dime_rolls : '') : '',
          nickelRolls: drawerDraft ? (drawerDraft.nickel_rolls && drawerDraft.nickel_rolls !== 0 ? drawerDraft.nickel_rolls : '') : '',
          pennyRolls: drawerDraft ? (drawerDraft.penny_rolls && drawerDraft.penny_rolls !== 0 ? drawerDraft.penny_rolls : '') : ''
        }));
        
        // Load existing image if present
        if (draft.label_image_url) {
          setLabelImageUrl(draft.label_image_url);
        } else {
          setLabelImageUrl(null);
        }
        setLabelImage(null); // Clear any new file selection
        
        showStatusMessage('Retrieved draft details for editing.', 'info');
      } catch (error) {
        console.error('Error loading draft:', error);
        showStatusMessage('Error loading draft: ' + error.message, 'error');
      }
    };
    
    loadDraft();
  }, [navigate, location.search]);

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
      const selectedDate = new Date(value + 'T00:00:00-08:00'); // PST
      const today = new Date(getPSTDate() + 'T00:00:00-08:00'); // PST
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < (today -  1 * 24 * 60 * 60 * 1000)) {
        showStatusMessage('Cannot select prior days which are over 24 hrs old. Cash drop is for immediate shift/day closure.', 'error');
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

  const handleSaveDraft = async () => {
    if (!isAllowedCashDropDate(formData.date)) {
      showStatusMessage('Drafts can only be saved for the current day or the previous day (PST).', 'error');
      return;
    }
    const token = sessionStorage.getItem('access_token');
    setIsSubmitting(true);
    try {
      // 1. Save/Update Drawer
      const drawerData = {
        workstation: formData.workStation,
        shift_number: formData.shiftNumber,
        date: formData.date,
        starting_cash: parseFloat(formData.startingCash),
        total_cash: parseFloat(calculateTotalCash()),
        status: 'drafted',
        hundreds: parseFloat(formData.hundreds || 0),
        fifties: parseFloat(formData.fifties || 0),
        twenties: parseFloat(formData.twenties || 0),
        tens: parseFloat(formData.tens || 0),
        fives: parseFloat(formData.fives || 0),
        twos: parseFloat(formData.twos || 0),
        ones: parseFloat(formData.ones || 0),
        half_dollars: parseFloat(formData.halfDollars || 0),
        quarters: parseFloat(formData.quarters || 0),
        dimes: parseFloat(formData.dimes || 0),
        nickels: parseFloat(formData.nickels || 0),
        pennies: parseFloat(formData.pennies || 0),
        quarter_rolls: parseFloat(formData.quarterRolls || 0),
        dime_rolls: parseFloat(formData.dimeRolls || 0),
        nickel_rolls: parseFloat(formData.nickelRolls || 0),
        penny_rolls: parseFloat(formData.pennyRolls || 0)
      };

      let dRes;
      if (draftDrawerId) {
        dRes = await fetch(API_ENDPOINTS.CASH_DRAWER_BY_ID(draftDrawerId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(drawerData),
        });
      } else {
        dRes = await fetch(API_ENDPOINTS.CASH_DRAWER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(drawerData),
        });
      }

      if (!dRes.ok) {
        const errorData = await dRes.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to save Drawer draft.');
      }
      const dResult = await dRes.json();
      setDraftDrawerId(dResult.id);

      // 2. Save/Update Drop as Draft
      const dropForm = new FormData();
      dropForm.append('drawer_entry', dResult.id);
      dropForm.append('workstation', formData.workStation);
      dropForm.append('shift_number', formData.shiftNumber);
      dropForm.append('date', formData.date);
      dropForm.append('drop_amount', calculateDropAmount());
      dropForm.append('ws_label_amount', formData.cashReceivedOnReceipt);
      dropForm.append('variance', calculateVariance());
      dropForm.append('status', 'drafted');
      if (formData.notes) dropForm.append('notes', formData.notes);
      if (labelImage) dropForm.append('label_image', labelImage);

      Object.keys(cashDropDenominations || {}).forEach(key => {
        const backendKey = key === 'halfDollars' ? 'half_dollars' : key;
        dropForm.append(backendKey, cashDropDenominations[key] || 0);
      });

      let dropRes;
      if (draftId) {
        dropRes = await fetch(API_ENDPOINTS.CASH_DROP_BY_ID(draftId), {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` },
          body: dropForm,
        });
      } else {
        dropRes = await fetch(API_ENDPOINTS.CASH_DROP, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: dropForm,
        });
      }

      if (!dropRes.ok) {
        const errorData = await dropRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save draft.');
      }
      const dropResult = await dropRes.json();
      setDraftId(dropResult.id);
      
      // Reset form to new cash drop after saving draft
      setFormData({
        employeeName: formData.employeeName,
        shiftNumber: '',
        workStation: '',
        date: getPSTDate(),
        startingCash: adminSettings.starting_amount.toString(),
        cashReceivedOnReceipt: '',
        pennies: 0, nickels: 0, dimes: 0, quarters: 0, halfDollars: 0,
        ones: 0, twos: 0, fives: 0, tens: 0, twenties: 0, fifties: 0, hundreds: 0,
        notes: ''
      });
      setLabelImage(null);
      setLabelImageUrl(null);
      setDraftId(null);
      setDraftDrawerId(null);
      
      showStatusMessage('Draft saved successfully. Form reset for new cash drop.', 'success');
    } catch (err) {
      showStatusMessage(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!draftId) {
      showStatusMessage('No draft to delete.', 'error');
      return;
    }

    const token = sessionStorage.getItem('access_token');
    setIsSubmitting(true);
    try {
      // Delete cash drop draft
      const dropRes = await fetch(API_ENDPOINTS.DELETE_CASH_DROP(draftId), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!dropRes.ok) {
        const error = await dropRes.json();
        throw new Error(error.error || 'Failed to delete draft.');
      }
      // Backend deletes the linked drawer draft when drop draft is deleted

      // Reset form
      setFormData({
        employeeName: formData.employeeName,
        shiftNumber: '',
        workStation: '',
        date: getPSTDate(),
        startingCash: adminSettings.starting_amount.toString(),
        cashReceivedOnReceipt: '',
        pennies: 0, nickels: 0, dimes: 0, quarters: 0, halfDollars: 0,
        ones: 0, twos: 0, fives: 0, tens: 0, twenties: 0, fifties: 0, hundreds: 0,
        notes: ''
      });
      setLabelImage(null);
      setLabelImageUrl(null);
      setDraftId(null);
      setDraftDrawerId(null);
      
      showStatusMessage('Draft deleted successfully.', 'success');
    } catch (err) {
      showStatusMessage(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!isAllowedCashDropDate(formData.date)) {
      showStatusMessage('Cash drop can only be submitted for the current day or the previous day (PST).', 'error');
      return;
    }
    const token = sessionStorage.getItem('access_token');
    setIsSubmitting(true);
    try {
      // Check max cash drops per day (excluding drafts and ignored)
      const todayDropsResponse = await fetch(`${API_ENDPOINTS.CASH_DROP}?datefrom=${formData.date}&dateto=${formData.date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (todayDropsResponse.ok) {
        const todayDrops = await todayDropsResponse.json();
        const countForLimit = todayDrops.filter(d => d.status !== 'drafted' && d.status !== 'ignored').length;
        if (countForLimit >= adminSettings.max_cash_drops_per_day) {
          showStatusMessage(`Maximum cash drops per day (${adminSettings.max_cash_drops_per_day}) reached. Please ignore any incorrect entries first.`, 'error');
          setIsSubmitting(false);
          return;
        }
      }

      // Validate cash drop can be submitted (no duplicate) before creating/updating drawer
      const validateRes = await fetch(API_ENDPOINTS.CASH_DROP_VALIDATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          workstation: formData.workStation,
          shift_number: formData.shiftNumber,
          date: formData.date,
          ...(draftId != null && { draftId }),
        }),
      });
      if (!validateRes.ok) {
        const errorData = await validateRes.json().catch(() => ({ error: 'Cash drop validation failed.' }));
        showStatusMessage(errorData.error || 'Cash drop validation failed.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 1. Update existing drawer if draft exists, otherwise create new one (only after drop is validated)
      const drawerData = {
        workstation: formData.workStation,
        shift_number: formData.shiftNumber,
        date: formData.date,
        starting_cash: parseFloat(formData.startingCash),
        total_cash: parseFloat(calculateTotalCash()),
        status: 'submitted',
        hundreds: parseFloat(formData.hundreds || 0),
        fifties: parseFloat(formData.fifties || 0),
        twenties: parseFloat(formData.twenties || 0),
        tens: parseFloat(formData.tens || 0),
        fives: parseFloat(formData.fives || 0),
        twos: parseFloat(formData.twos || 0),
        ones: parseFloat(formData.ones || 0),
        half_dollars: parseFloat(formData.halfDollars || 0),
        quarters: parseFloat(formData.quarters || 0),
        dimes: parseFloat(formData.dimes || 0),
        nickels: parseFloat(formData.nickels || 0),
        pennies: parseFloat(formData.pennies || 0),
        quarter_rolls: parseFloat(formData.quarterRolls || 0),
        dime_rolls: parseFloat(formData.dimeRolls || 0),
        nickel_rolls: parseFloat(formData.nickelRolls || 0),
        penny_rolls: parseFloat(formData.pennyRolls || 0)
      };

      let dRes;
      if (draftDrawerId) {
        // Update existing drawer
        dRes = await fetch(API_ENDPOINTS.CASH_DRAWER_BY_ID(draftDrawerId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(drawerData),
        });
      } else {
        // Create new drawer
        dRes = await fetch(API_ENDPOINTS.CASH_DRAWER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(drawerData),
      });
      }

      if (!dRes.ok) {
        const errorData = await dRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Drawer save error:', errorData);
        throw new Error(errorData.error || 'Failed to save Drawer data.');
      }
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
      dropForm.append('status', 'submitted');
      if (formData.notes) dropForm.append('notes', formData.notes);
      if (labelImage) dropForm.append('label_image', labelImage);

      Object.keys(cashDropDenominations).forEach(key => {
        const backendKey = key === 'halfDollars' ? 'half_dollars' : key;
        dropForm.append(backendKey, cashDropDenominations[key]);
      });

      let dropRes;
      if (draftId) {
        // Update existing draft
        dropRes = await fetch(API_ENDPOINTS.CASH_DROP_BY_ID(draftId), {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` },
          body: dropForm,
        });
      } else {
        // Create new
        dropRes = await fetch(API_ENDPOINTS.CASH_DROP, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: dropForm,
      });
      }

      if (!dropRes.ok) {
        const errorData = await dropRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save Cash Drop & Image.');
      }
      
      // Clear draft IDs
      setDraftId(null);
      setDraftDrawerId(null);
      
      // Success - navigate immediately
      showStatusMessage('Cash Drop submitted successfully.', 'success');
      setTimeout(() => navigate('/cd-dashboard'), 500);

    } catch (err) {
      setIsSubmitting(false);
      showStatusMessage(err.message, 'error');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center" style={{ fontFamily: 'Calibri, Verdana, sans-serif' }}>Initializing Terminal...</div>;

  return (
    <div className={`min-h-screen bg-gray-50 p-3 md:p-6 ${isSubmitting ? 'blur-sm pointer-events-none' : ''}`} style={{ fontFamily: 'Calibri, Verdana, sans-serif', fontSize: '14px', color: COLORS.gray }}>
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: COLORS.magenta }}></div>
            <p className="font-black uppercase tracking-widest" style={{ fontSize: '18px', color: COLORS.magenta }}>Processing...</p>
          </div>
        </div>
      )}
      
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
                <select name="shiftNumber" value={formData.shiftNumber} onChange={handleChange} className="p-2 bg-white border-b border-gray-300 focus:border-pink-600 outline-none" style={{ fontSize: '14px' }}>
                  <option value="">Select Shift</option>
                  {adminSettings.shifts.map((shift, idx) => (
                    <option key={idx} value={shift}>{shift}</option>
                  ))}
                </select>
            </div>
            <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Register Number</label>
                <select name="workStation" value={formData.workStation} onChange={handleChange} className="p-2 bg-white border-b border-gray-300 focus:border-pink-600 outline-none" style={{ fontSize: '14px' }}>
                  <option value="">Select Register</option>
                  {adminSettings.workstations.map((workstation, idx) => (
                    <option key={idx} value={workstation}>{workstation}</option>
                  ))}
                </select>
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
                <input type="date" name="date" value={formData.date} onChange={handleChange} min={getPSTDate()-2*24*60*60*1000} max={getPSTDate()} className="p-2 bg-white border-b border-gray-300 font-bold focus:border-pink-600 outline-none" style={{ fontSize: '14px', color: COLORS.gray }} />
            </div>
            <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Starting Cash</label>
                <div className="p-2 bg-transparent border-b border-gray-300 font-bold" style={{ fontSize: '14px', color: COLORS.magenta }}>${formData.startingCash}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 items-start">
            {/* Input Column */}
            <div className="bg-white border rounded-lg p-4 md:p-6">
              <h3 className="font-black uppercase mb-4 md:mb-6 tracking-widest border-b pb-2" style={{ fontSize: '18px', color: COLORS.gray }}>1. Register Cash Count</h3>
              <div className="space-y-3">
                {DENOMINATION_CONFIG.map(d => {
                  const val = formData[d.field];
                  const isZero = val == null || Number(val) === 0;
                  return (
                    <div key={d.field} className="flex justify-between items-center">
                      <span className="text-xs font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>{d.display}</span>
                      <input type="text" name={d.field} value={isZero ? '' : String(val)} onChange={handleChange} className="w-20 p-1 border rounded text-right" style={{ fontSize: '14px' }} />
                    </div>
                  );
                })}
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
                {labelImageUrl && !labelImage && (
                  <div className="mb-4">
                    <p className="font-bold mb-2" style={{ color: COLORS.gray, fontSize: '14px' }}>Existing Image:</p>
                    <img 
                      src={labelImageUrl} 
                      alt="Cash Drop Receipt" 
                      className="w-full h-auto rounded-lg border border-gray-300 max-h-64 object-contain"
                      onError={(e) => {
                        console.error('Error loading image:', labelImageUrl);
                        e.target.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setLabelImageUrl(null)}
                      className="mt-2 px-3 py-1 text-white font-bold rounded transition"
                      style={{ backgroundColor: '#EF4444', fontSize: '12px' }}
                    >
                      Remove Image
                    </button>
                  </div>
                )}
                <label className={`group flex flex-col items-center justify-center w-full h-32 md:h-40 border-2 border-dashed rounded-lg cursor-pointer transition-all ${(labelImage || labelImageUrl) ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-pink-500'}`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <p className="font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>
                      {(labelImage || labelImageUrl) ? "✅ Image Ready" : "Upload Cash Drop Receipt (Optional)"}
                    </p>
                    <p className="mt-1" style={{ color: COLORS.gray, fontSize: '14px' }}>
                      {labelImage ? labelImage.name : (labelImageUrl ? "Existing image loaded" : "PNG, JPG or JPEG")}
                    </p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => {
                      setLabelImage(e.target.files[0]);
                      setLabelImageUrl(null); // Clear existing image URL when new file is selected
                    }} 
                    accept="image/*" 
                  />
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

              <div className="space-y-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleSaveDraft} 
                    disabled={isSubmitting || !formData.workStation || !formData.shiftNumber}
                    className="py-3 md:py-4 text-white font-black rounded-lg shadow-lg transform transition active:scale-95 uppercase tracking-widest disabled:bg-gray-400 disabled:cursor-not-allowed" 
                    style={{ backgroundColor: COLORS.gray, fontSize: '18px' }}
                  >
                    Save as Draft
                  </button>
                  {draftId && (
                    <button 
                      onClick={handleDeleteDraft} 
                      disabled={isSubmitting}
                      className="py-3 md:py-4 text-white font-black rounded-lg shadow-lg transform transition active:scale-95 uppercase tracking-widest disabled:bg-gray-400 disabled:cursor-not-allowed" 
                      style={{ backgroundColor: '#EF4444', fontSize: '18px' }}
                    >
                      Delete Draft
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CashDrop;
