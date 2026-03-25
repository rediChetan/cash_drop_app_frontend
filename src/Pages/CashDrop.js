import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import { getPSTDate } from '../utils/dateUtils';

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
    pennies: 0, nickels: 0, dimes: 0, quarters: 0,
    ones: 0, fives: 0, tens: 0, twenties: 0, fifties: 0, hundreds: 0,
    twos: 0, half_dollars: 0,
    quarterRolls: 0, dimeRolls: 0, nickelRolls: 0, pennyRolls: 0,
    notes: ''
  });

  const [labelImage, setLabelImage] = useState(null);
  const [labelImageUrl, setLabelImageUrl] = useState(null); // For displaying existing images
  const [existingImageLoadError, setExistingImageLoadError] = useState(false);
  const [cashDropDenominations, setCashDropDenominations] = useState(null);
  const [remainingCashInDrawer, setRemainingCashInDrawer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ show: false, text: '', type: 'info' });
  const [adminSettings, setAdminSettings] = useState({
    shifts: [],
    workstations: [],
    starting_amount: 200.00,
    max_cash_drops_per_day: 10,
    cash_drop_receipt_image_required: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [draftDrawerId, setDraftDrawerId] = useState(null);
  // Calendar: { date, canCashDrop, isCurrentDay }[] for the month currently viewed in picker or selected date
  const [calendarDates, setCalendarDates] = useState([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerView, setPickerView] = useState({ year: null, month: null }); // month 1-12, when open
  const [duplicateDropWarning, setDuplicateDropWarning] = useState(null); // message if a drop already exists for this shift/register/date

  const DENOMINATION_CONFIG = [
    { name: 'Hundreds', value: 100, field: 'hundreds', display: 'Hundreds ($100)' },
    { name: 'Fifties', value: 50, field: 'fifties', display: 'Fifties ($50)' },
    { name: 'Twenties', value: 20, field: 'twenties', display: 'Twenties ($20)' },
    { name: 'Tens', value: 10, field: 'tens', display: 'Tens ($10)' },
    { name: 'Fives', value: 5, field: 'fives', display: 'Fives ($5)' },
    { name: 'Twos', value: 2, field: 'twos', display: 'Twos ($2)' },
    { name: 'Ones', value: 1, field: 'ones', display: 'Ones ($1)' },
    { name: 'Half Dollars', value: 0.5, field: 'half_dollars', display: 'Half Dollars ($0.50)' },
    { name: 'Quarters', value: 0.25, field: 'quarters', display: 'Quarters ($0.25)' },
    { name: 'Dimes', value: 0.10, field: 'dimes', display: 'Dimes ($0.10)' },
    { name: 'Nickels', value: 0.05, field: 'nickels', display: 'Nickels ($0.05)' },
    { name: 'Pennies', value: 0.01, field: 'pennies', display: 'Pennies ($0.01)' },
  ];
  // 1 quarter roll = 40×$0.25=$10; 1 dime roll = 50×$0.10=$5; 1 nickel roll = 40×$0.05=$2; 1 penny roll = 50×$0.01=$0.50
  /** apiField = column on cash_drop / FormData (snake_case); field = form state (camelCase) */
  const ROLLS_CONFIG = [
    { name: 'Quarter Rolls', value: 10, field: 'quarterRolls', apiField: 'quarter_rolls', display: 'Quarter Rolls (40×$0.25=$10)' },
    { name: 'Dime Rolls', value: 5, field: 'dimeRolls', apiField: 'dime_rolls', display: 'Dime Rolls (50×$0.10=$5)' },
    { name: 'Nickel Rolls', value: 2, field: 'nickelRolls', apiField: 'nickel_rolls', display: 'Nickel Rolls (40×$0.05=$2)' },
    { name: 'Penny Rolls', value: 0.50, field: 'pennyRolls', apiField: 'penny_rolls', display: 'Penny Rolls (50×$0.01=$0.50)' },
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
            half_dollars: drawerDraft.half_dollars || 0,
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
          twos: drawerDraft ? (drawerDraft.twos != null && drawerDraft.twos !== 0 ? drawerDraft.twos : '') : '',
          ones: drawerDraft ? (drawerDraft.ones && drawerDraft.ones !== 0 ? drawerDraft.ones : '') : '',
          half_dollars: drawerDraft ? (drawerDraft.half_dollars != null && drawerDraft.half_dollars !== 0 ? drawerDraft.half_dollars : '') : '',
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
          setExistingImageLoadError(false);
        } else {
          setLabelImageUrl(null);
          setExistingImageLoadError(false);
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

  // Which month to fetch: when picker is open use pickerView, else use selected date's month
  const calendarTarget = datePickerOpen && pickerView.year && pickerView.month
    ? pickerView
    : (() => {
        const dateStr = formData.date || getPSTDate();
        const parts = dateStr.split('-');
        return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
      })();

  // Fetch cash drop calendar for the target month
  useEffect(() => {
    const { year: y, month: m } = calendarTarget;
    if (!y || !m) return;
    const fetchCalendar = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.CASH_DROP_CALENDAR(y, m));
        if (res.ok) {
          const data = await res.json();
          setCalendarDates(data.dates || []);
        }
      } catch (e) {
        console.error('Error fetching cash drop calendar:', e);
      }
    };
    fetchCalendar();
  }, [calendarTarget.year, calendarTarget.month]);

  // Check for existing drop when shift + register + date are set (early warning)
  useEffect(() => {
    const { shiftNumber, workStation, date } = formData;
    if (!shiftNumber || !workStation || !date) {
      setDuplicateDropWarning(null);
      return;
    }
    let cancelled = false;
    const check = async () => {
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        setDuplicateDropWarning(null);
        return;
      }
      try {
        const res = await fetch(API_ENDPOINTS.CASH_DROP_VALIDATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            workstation: workStation,
            shift_number: shiftNumber,
            date,
            ...(draftId != null && { draftId }),
          }),
        });
        if (cancelled) return;
        if (res.status === 400) {
          const data = await res.json().catch(() => ({}));
          setDuplicateDropWarning(data.error || 'A cash drop already exists for this shift, register, and date.');
        } else {
          setDuplicateDropWarning(null);
        }
      } catch (e) {
        if (!cancelled) setDuplicateDropWarning(null);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [formData.shiftNumber, formData.workStation, formData.date, draftId]);

  // --- HELPERS ---
  const showStatusMessage = (text, type = 'info') => {
    setStatusMessage({ show: true, text, type });
    setTimeout(() => setStatusMessage({ show: false, text: '', type: 'info' }), 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Prevent selecting future dates
    if (name === 'date' && value > getPSTDate()) {
      showStatusMessage('Cannot select a future date.', 'error');
      return;
    }
    
    // Parse numeric values for numeric fields (except cashReceivedOnReceipt which should remain as text to allow decimals)
    const numericFields = ['startingCash', 'pennies', 'nickels', 'dimes', 'quarters', 'ones', 'fives', 'tens', 'twenties', 'fifties', 'hundreds', 'twos', 'half_dollars', 'quarterRolls', 'dimeRolls', 'nickelRolls', 'pennyRolls'];
    if (numericFields.includes(name)) {
      const numValue = parseFloat(value) || 0;
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      // For cashReceivedOnReceipt and other text fields, keep as string to allow decimal input
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const calculateTotalCash = () => {
    const denomTotal = DENOMINATION_CONFIG.reduce((acc, d) => acc + (formData[d.field] || 0) * d.value, 0);
    const rollsTotal = ROLLS_CONFIG.reduce((acc, r) => acc + (formData[r.field] || 0) * r.value, 0);
    return (denomTotal + rollsTotal).toFixed(2);
  };
  const calculateDropAmount = () => (parseFloat(calculateTotalCash()) - parseFloat(formData.startingCash)).toFixed(2);
  const calculateVariance = () => (parseFloat(calculateDropAmount()) - parseFloat(formData.cashReceivedOnReceipt || 0)).toFixed(2);

  /** Same greedy allocation as the UI; used for submit/draft FormData so the server always gets denoms (not only after expanding the breakdown). */
  const computeDropDenominationBreakdown = () => {
    const amountToDrop = parseFloat(calculateDropAmount());
    if (amountToDrop <= 0) return null;

    let remaining = Math.round(amountToDrop * 100);
    const dropBreakdown = {};

    DENOMINATION_CONFIG.forEach(denom => {
      const valCents = Math.round(denom.value * 100);
      const available = formData[denom.field];
      let count = 0;
      if (valCents > 0 && remaining >= valCents) {
        count = Math.min(Math.floor(remaining / valCents), available);
        remaining -= count * valCents;
      }
      dropBreakdown[denom.field] = count;
    });

    const REMAINING_EPS_CENTS = 1;
    const rollsNecessary = remaining > REMAINING_EPS_CENTS;

    ROLLS_CONFIG.forEach((roll) => {
      const valCents = Math.round(roll.value * 100);
      const available = Math.floor(parseFloat(formData[roll.field]) || 0);
      let count = 0;
      if (rollsNecessary && valCents > 0 && remaining > REMAINING_EPS_CENTS) {
        count = Math.min(Math.floor(remaining / valCents), available);
        remaining -= count * valCents;
      }
      dropBreakdown[roll.apiField] = count;
    });

    return dropBreakdown;
  };

  const calculateDenominations = () => {
    const dropBreakdown = computeDropDenominationBreakdown();
    if (!dropBreakdown) {
      setCashDropDenominations(null);
      setRemainingCashInDrawer(null);
      return;
    }

    const finalDrawer = {};
    DENOMINATION_CONFIG.forEach(denom => {
      const available = formData[denom.field];
      finalDrawer[denom.field] = available - (dropBreakdown[denom.field] || 0);
    });
    ROLLS_CONFIG.forEach((roll) => {
      const available = Math.floor(parseFloat(formData[roll.field]) || 0);
      finalDrawer[roll.apiField] = available - (dropBreakdown[roll.apiField] || 0);
    });

    setCashDropDenominations(dropBreakdown);
    setRemainingCashInDrawer(finalDrawer);
  };

  const isSubmitValid = () => {
    const drop = parseFloat(calculateDropAmount());
    const mathCheck = Math.abs(drop - (parseFloat(calculateTotalCash()) - parseFloat(formData.startingCash))) < 0.01;
    const hasReceiptImage = !!(labelImage || labelImageUrl);
    const imageOk = !adminSettings.cash_drop_receipt_image_required || hasReceiptImage;
    return mathCheck && drop > 0 && formData.workStation && imageOk;
  };

  // Whether selected date is allowed for cash drop (from calendar API)
  const selectedDateInfo = calendarDates.find(d => d.date === formData.date);
  const isSelectedDateAllowed = selectedDateInfo ? selectedDateInfo.canCashDrop : null; // null = unknown (e.g. loading)

  const handleSaveDraft = async () => {
    if (isSelectedDateAllowed === false) {
      showStatusMessage('Cash drop is not allowed for this date (check admin settings).', 'error');
      return;
    }
    const token = sessionStorage.getItem('access_token');
    const hadDropDraft = !!draftId;
    const hadDrawerDraft = !!draftDrawerId;
    setIsSubmitting(true);
    try {
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
        half_dollars: parseFloat(formData.half_dollars || 0),
        quarters: parseFloat(formData.quarters || 0),
        dimes: parseFloat(formData.dimes || 0),
        nickels: parseFloat(formData.nickels || 0),
        pennies: parseFloat(formData.pennies || 0),
        quarter_rolls: parseFloat(formData.quarterRolls || 0),
        dime_rolls: parseFloat(formData.dimeRolls || 0),
        nickel_rolls: parseFloat(formData.nickelRolls || 0),
        penny_rolls: parseFloat(formData.pennyRolls || 0)
      };

      // 1. Save cash drop draft first (no new drawer yet — avoids orphan drawer if this fails).
      // If a drawer already exists for this draft, keep the link so the row stays consistent.
      const dropForm = new FormData();
      if (draftDrawerId) {
        dropForm.append('drawer_entry', draftDrawerId);
      }
      dropForm.append('workstation', formData.workStation);
      dropForm.append('shift_number', formData.shiftNumber);
      dropForm.append('date', formData.date);
      dropForm.append('drop_amount', calculateDropAmount());
      dropForm.append('ws_label_amount', formData.cashReceivedOnReceipt);
      dropForm.append('variance', calculateVariance());
      dropForm.append('status', 'drafted');
      if (formData.notes) dropForm.append('notes', formData.notes);
      if (labelImage) dropForm.append('label_image', labelImage);

      const draftDenomBreakdown = computeDropDenominationBreakdown();
      const d = draftDenomBreakdown || {};
      Object.keys(d).forEach(key => {
        dropForm.append(key, d[key] ?? 0);
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
      const savedDropId = dropResult.id;

      // 2. Save / update cash drawer draft
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
        if (!hadDropDraft) {
          await fetch(API_ENDPOINTS.DELETE_CASH_DROP(savedDropId), {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
        }
        throw new Error(errorData.error || 'Failed to save Drawer draft.');
      }
      const dResult = await dRes.json();

      // 3. Link new drawer to the cash drop (only when the drawer was just created)
      if (!hadDrawerDraft && dResult?.id) {
        const linkRes = await fetch(API_ENDPOINTS.CASH_DROP_BY_ID(savedDropId), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ drawer_entry: dResult.id }),
        });
        if (!linkRes.ok) {
          const linkErr = await linkRes.json().catch(() => ({}));
          await fetch(API_ENDPOINTS.CASH_DRAWER_BY_ID(dResult.id), {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!hadDropDraft) {
            await fetch(API_ENDPOINTS.DELETE_CASH_DROP(savedDropId), {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` },
            });
          }
          throw new Error(linkErr.error || 'Failed to link cash drawer to cash drop.');
        }
      }

      setDraftId(savedDropId);
      setDraftDrawerId(dResult.id);
      
      // Reset form to new cash drop after saving draft
      setFormData({
        employeeName: formData.employeeName,
        shiftNumber: '',
        workStation: '',
        date: getPSTDate(),
        startingCash: adminSettings.starting_amount.toString(),
        cashReceivedOnReceipt: '',
        pennies: 0, nickels: 0, dimes: 0, quarters: 0,
        ones: 0, fives: 0, tens: 0, twenties: 0, fifties: 0, hundreds: 0,
        twos: 0, half_dollars: 0,
        quarterRolls: 0, dimeRolls: 0, nickelRolls: 0, pennyRolls: 0,
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
        pennies: 0, nickels: 0, dimes: 0, quarters: 0,
        ones: 0, fives: 0, tens: 0, twenties: 0, fifties: 0, hundreds: 0,
        twos: 0, half_dollars: 0,
        quarterRolls: 0, dimeRolls: 0, nickelRolls: 0, pennyRolls: 0,
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
    if (isSelectedDateAllowed === false) {
      showStatusMessage('Cash drop is not allowed for this date (check admin settings).', 'error');
      return;
    }
    if (adminSettings.cash_drop_receipt_image_required && !labelImage && !labelImageUrl) {
      showStatusMessage('A cash drop receipt image is required. Please upload an image before submitting.', 'error');
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

      const drawerDataSubmitted = {
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
        half_dollars: parseFloat(formData.half_dollars || 0),
        quarters: parseFloat(formData.quarters || 0),
        dimes: parseFloat(formData.dimes || 0),
        nickels: parseFloat(formData.nickels || 0),
        pennies: parseFloat(formData.pennies || 0),
        quarter_rolls: parseFloat(formData.quarterRolls || 0),
        dime_rolls: parseFloat(formData.dimeRolls || 0),
        nickel_rolls: parseFloat(formData.nickelRolls || 0),
        penny_rolls: parseFloat(formData.pennyRolls || 0)
      };

      // 1. Save drawer as DRAFT only — if cash drop submit fails next, we delete this draft (no orphan submitted drawer).
      const drawerDataDraft = { ...drawerDataSubmitted, status: 'drafted' };
      let dRes;
      if (draftDrawerId) {
        dRes = await fetch(API_ENDPOINTS.CASH_DRAWER_BY_ID(draftDrawerId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(drawerDataDraft),
        });
      } else {
        dRes = await fetch(API_ENDPOINTS.CASH_DRAWER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(drawerDataDraft),
        });
      }

      if (!dRes.ok) {
        const errorData = await dRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Drawer save error:', errorData);
        throw new Error(errorData.error || 'Failed to save Drawer data.');
      }
      const dResult = await dRes.json();
      const drawerIdForRollback = dResult.id;

      // 2. Submit cash drop (linked to draft drawer). If this fails, remove the draft drawer so CD dashboard stays consistent.
      const submitBreakdown = computeDropDenominationBreakdown();
      const denomPayload = submitBreakdown || {};
      const dropForm = new FormData();
      dropForm.append('drawer_entry', drawerIdForRollback);
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

      Object.keys(denomPayload).forEach(key => {
        dropForm.append(key, denomPayload[key]);
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
        // Only remove the drawer we just created. If we were finalizing an existing draft, deleting the drawer
        // could CASCADE-delete the cash drop — leave the draft drawer so the user can retry.
        if (!draftId) {
          const delRes = await fetch(API_ENDPOINTS.CASH_DRAWER_BY_ID(drawerIdForRollback), {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!delRes.ok) {
            console.error('Rollback: failed to delete draft drawer after cash drop error', await delRes.text().catch(() => ''));
          }
        }
        throw new Error(errorData.error || 'Failed to save Cash Drop & Image.');
      }

      // 3. Promote drawer to submitted now that cash drop is saved.
      const finalizeDrawerRes = await fetch(API_ENDPOINTS.CASH_DRAWER_BY_ID(drawerIdForRollback), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(drawerDataSubmitted),
      });
      if (!finalizeDrawerRes.ok) {
        const fd = await finalizeDrawerRes.json().catch(() => ({}));
        showStatusMessage(
          fd.error || 'Cash drop was saved but updating the cash drawer to submitted failed. Check the dashboard or try again.',
          'error'
        );
      } else {
        showStatusMessage('Cash Drop submitted successfully.', 'success');
        setTimeout(() => navigate('/cd-dashboard'), 500);
      }

      setDraftId(null);
      setDraftDrawerId(null);
    } catch (err) {
      showStatusMessage(err.message, 'error');
    } finally {
      setIsSubmitting(false);
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
                <input type="text" name="cashReceivedOnReceipt" value={formData.cashReceivedOnReceipt} onChange={handleChange} autoComplete="off" className="p-2 bg-white border-b border-gray-300 font-bold focus:border-pink-600 outline-none" style={{ fontSize: '14px', color: COLORS.magenta }} />
              </div>
            </div>
            
            {/* Right Div: Display Only Fields */}
            <div className="space-y-3">
            <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Employee</label>
                <div className="p-2 bg-transparent border-b border-gray-300 font-bold" style={{ fontSize: '14px', color: COLORS.gray }}>{formData.employeeName}</div>
            </div>
            <div className="flex flex-col relative">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Date</label>
                <button
                  type="button"
                  onClick={() => {
                    const [y, m] = (formData.date || getPSTDate()).split('-').map(Number);
                    setPickerView({ year: y, month: m });
                    setDatePickerOpen(true);
                  }}
                  className="p-2 bg-white border-b border-gray-300 font-bold text-left focus:border-pink-600 outline-none focus:ring-1 focus:ring-pink-500 rounded-t"
                  style={{ fontSize: '14px', color: COLORS.gray }}
                >
                  {formData.date || getPSTDate()}
                </button>
                {/* Custom calendar popover: colored days when selecting date */}
                {datePickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" aria-hidden onClick={() => setDatePickerOpen(false)} />
                    <div className="absolute left-0 top-full z-50 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[260px]">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => setPickerView(prev => {
                            const d = new Date(prev.year, prev.month - 1, 1);
                            d.setMonth(d.getMonth() - 1);
                            return { year: d.getFullYear(), month: d.getMonth() + 1 };
                          })}
                          className="p-1 rounded hover:bg-gray-100 font-bold"
                          style={{ color: COLORS.gray }}
                        >
                          ‹
                        </button>
                        <span className="font-bold" style={{ fontSize: '14px', color: COLORS.gray }}>
                          {new Date(pickerView.year, pickerView.month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPickerView(prev => {
                            const d = new Date(prev.year, prev.month - 1, 1);
                            d.setMonth(d.getMonth() + 1);
                            return { year: d.getFullYear(), month: d.getMonth() + 1 };
                          })}
                          className="p-1 rounded hover:bg-gray-100 font-bold"
                          style={{ color: COLORS.gray }}
                        >
                          ›
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-0.5 text-center" style={{ fontSize: '12px' }}>
                        {['S','M','T','W','T','F','S'].map(d => <span key={d} className="font-bold py-1" style={{ color: COLORS.gray }}>{d}</span>)}
                        {(() => {
                          const first = new Date(pickerView.year, pickerView.month - 1, 1);
                          const startPad = first.getDay();
                          const daysInMonth = new Date(pickerView.year, pickerView.month, 0).getDate();
                          const today = getPSTDate();
                          const cells = [];
                          for (let i = 0; i < startPad; i++) cells.push(<span key={`pad-${i}`} />);
                          for (let d = 1; d <= daysInMonth; d++) {
                            const dateStr = `${pickerView.year}-${String(pickerView.month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                            const info = calendarDates.find(x => x.date === dateStr);
                            const isCurrent = dateStr === today;
                            const canDrop = info?.canCashDrop;
                            const isSelected = formData.date === dateStr;
                            let bg = 'bg-gray-100';
                            if (isCurrent) bg = 'bg-blue-500 text-white';
                            else if (canDrop === true) bg = 'bg-green-500 text-white';
                            else if (canDrop === false) bg = 'bg-red-500 text-white';
                            const isFuture = dateStr > today;
                            cells.push(
                              <button
                                key={dateStr}
                                type="button"
                                onClick={() => {
                                  if (isFuture) return;
                                  setFormData(prev => ({ ...prev, date: dateStr }));
                                  setDatePickerOpen(false);
                                }}
                                disabled={isFuture}
                                className={`py-1.5 rounded ${bg} ${isSelected ? 'ring-2 ring-offset-1 ring-black' : ''} ${isFuture ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                                title={info ? (canDrop ? 'Can add cash drop' : 'Cannot add cash drop') : dateStr}
                              >
                                {d}
                              </button>
                            );
                          }
                          return cells;
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            <div className="flex flex-col">
                <label className="text-xs font-bold uppercase mb-1" style={{ color: COLORS.gray, fontSize: '14px' }}>Starting Cash</label>
                <div className="p-2 bg-transparent border-b border-gray-300 font-bold" style={{ fontSize: '14px', color: COLORS.magenta }}>${formData.startingCash}</div>
              </div>
            </div>
          </div>

          {/* Early warning: a cash drop already exists for this shift/register/date */}
          {duplicateDropWarning && (
            <div
              className="mb-4 p-4 rounded-lg"
              role="alert"
              style={{
                backgroundColor: '#FEF3C7',
                border: '2px solid #D97706',
                color: '#92400E',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                A cash drop already exists for this combination.
              </p>
              <p style={{ fontSize: '13px', margin: 0 }}>{duplicateDropWarning}</p>
            </div>
          )}

          {/* Early warning: cannot add cash drop for this date (show as soon as shift + workstation + date are set) */}
          {formData.shiftNumber && formData.workStation && formData.date && selectedDateInfo && selectedDateInfo.canCashDrop === false && (
            <div
              className="mb-6 p-4 rounded-lg"
              role="alert"
              style={{
                backgroundColor: '#FEE2E2',
                border: '2px solid #DC2626',
                color: '#991B1B',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                You cannot add a cash drop for this date.
              </p>
              <p style={{ fontSize: '13px', margin: 0 }}>
                The selected date ({formData.date}) is not allowed by current admin settings (allowed date range or bank drop rule). Choose a different date from the calendar above or contact an admin.
              </p>
            </div>
          )}

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
                      <input type="text" name={d.field} value={isZero ? '' : String(val)} onChange={handleChange} autoComplete="off" className="w-20 p-1 border rounded text-right" style={{ fontSize: '14px' }} />
                    </div>
                  );
                })}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <span className="text-xs font-bold uppercase" style={{ color: COLORS.gray, fontSize: '12px' }}>Rolls</span>
                </div>
                {ROLLS_CONFIG.map(r => {
                  const val = formData[r.field];
                  const isZero = val == null || Number(val) === 0;
                  return (
                    <div key={r.field} className="flex justify-between items-center">
                      <span className="text-xs font-bold" style={{ color: COLORS.gray, fontSize: '14px' }}>{r.display}</span>
                      <input type="text" name={r.field} value={isZero ? '' : String(val)} onChange={handleChange} autoComplete="off" className="w-20 p-1 border rounded text-right" style={{ fontSize: '14px' }} />
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
              <h3 className="font-black uppercase mb-2 tracking-widest border-b border-blue-100 pb-2" style={{ fontSize: '18px', color: COLORS.magenta }}>2. Suggested Cash Drop</h3>
              <p className="text-xs mb-4 md:mb-6" style={{ color: COLORS.gray }}>
                Rolls are listed only if the net drop still requires them after allocating bills and loose coins.
              </p>
              <div className="space-y-2">
                {cashDropDenominations ? (
                  <>
                    {DENOMINATION_CONFIG.map(d => cashDropDenominations[d.field] > 0 && (
                      <div key={d.field} className="flex justify-between p-2 bg-white rounded border border-blue-50">
                        <span className="text-xs font-bold uppercase" style={{ color: COLORS.gray, fontSize: '14px' }}>{d.display}</span>
                        <span className="font-black" style={{ color: COLORS.magenta, fontSize: '14px' }}>x {cashDropDenominations[d.field]}</span>
                      </div>
                    ))}
                    {ROLLS_CONFIG.map(r => (cashDropDenominations[r.apiField] || 0) > 0 && (
                      <div key={r.apiField} className="flex justify-between p-2 bg-white rounded border border-blue-50">
                        <span className="text-xs font-bold uppercase" style={{ color: COLORS.gray, fontSize: '14px' }}>{r.display}</span>
                        <span className="font-black" style={{ color: COLORS.magenta, fontSize: '14px' }}>x {cashDropDenominations[r.apiField]}</span>
                      </div>
                    ))}
                  </>
                ) : <p className="text-center text-gray-300 py-20 italic" style={{ fontSize: '14px' }}>Enter amounts to calculate...</p>}
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
                <h3 className="font-black uppercase mb-4 md:mb-6 tracking-widest border-b pb-2" style={{ fontSize: '18px', color: COLORS.gray }}>
                  3. Cash Drop Receipt {adminSettings.cash_drop_receipt_image_required ? '(Required)' : '(Optional)'}
                </h3>
                {labelImageUrl && !labelImage && (
                  <div className="mb-4">
                    <p className="font-bold mb-2" style={{ color: COLORS.gray, fontSize: '14px' }}>Existing Image:</p>
                    {existingImageLoadError ? (
                      <div className="py-6 rounded-lg border border-gray-300 bg-gray-50 text-center">
                        <p className="font-bold text-gray-600" style={{ fontSize: '14px' }}>Image unavailable</p>
                        <p className="text-sm text-gray-500 mt-1">The receipt image could not be loaded.</p>
                      </div>
                    ) : (
                      <img 
                        src={labelImageUrl} 
                        alt="Cash Drop Receipt" 
                        className="w-full h-auto rounded-lg border border-gray-300 max-h-64 object-contain"
                        onError={() => setExistingImageLoadError(true)}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => { setLabelImageUrl(null); setExistingImageLoadError(false); }}
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
                      {(labelImage || labelImageUrl)
                        ? '✅ Image Ready'
                        : adminSettings.cash_drop_receipt_image_required
                          ? 'Upload Cash Drop Receipt (Required)'
                          : 'Upload Cash Drop Receipt (Optional)'}
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
                      setLabelImageUrl(null);
                      setExistingImageLoadError(false);
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
                  autoComplete="off"
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
                    {parseFloat(calculateDropAmount()) <= 0 && "Drop Amount must be positive"}<br/>
                    {formData.workStation === '' && "Register Number is required"}<br/>
                    {formData.shiftNumber === '' && "Shift Number is required"}<br/>
                    {formData.cashReceivedOnReceipt === '' && "Cash Received on Receipt is required"}
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
