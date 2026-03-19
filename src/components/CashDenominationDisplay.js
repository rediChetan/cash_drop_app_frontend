import React, { useEffect } from 'react';

/** Bills: hundreds through ones */
export const BILLS_DENOMINATIONS = [
  { name: 'hundreds', value: 100, display: 'Hundreds ($100)' },
  { name: 'fifties', value: 50, display: 'Fifties ($50)' },
  { name: 'twenties', value: 20, display: 'Twenties ($20)' },
  { name: 'tens', value: 10, display: 'Tens ($10)' },
  { name: 'fives', value: 5, display: 'Fives ($5)' },
  { name: 'twos', value: 2, display: 'Twos ($2)' },
  { name: 'ones', value: 1, display: 'Ones ($1)' },
];

/** Coins + rolls */
export const COINS_ROLLS_DENOMINATIONS = [
  { name: 'half_dollars', value: 0.5, display: 'Half Dollars ($0.50)' },
  { name: 'quarters', value: 0.25, display: 'Quarters ($0.25)' },
  { name: 'dimes', value: 0.1, display: 'Dimes ($0.10)' },
  { name: 'nickels', value: 0.05, display: 'Nickels ($0.05)' },
  { name: 'pennies', value: 0.01, display: 'Pennies ($0.01)' },
  { name: 'quarter_rolls', value: 10, display: 'Quarter Rolls ($10)' },
  { name: 'dime_rolls', value: 5, display: 'Dime Rolls ($5)' },
  { name: 'nickel_rolls', value: 2, display: 'Nickel Rolls ($2)' },
  { name: 'penny_rolls', value: 0.5, display: 'Penny Rolls ($0.50)' },
];

export function computeBillsSubtotal(record) {
  return BILLS_DENOMINATIONS.reduce((s, d) => s + (Number(record[d.name]) || 0) * d.value, 0);
}

export function computeCoinsRollsSubtotal(record) {
  return COINS_ROLLS_DENOMINATIONS.reduce((s, d) => s + (Number(record[d.name]) || 0) * d.value, 0);
}

export function computeGrandDenomTotal(record) {
  return Math.round((computeBillsSubtotal(record) + computeCoinsRollsSubtotal(record)) * 100) / 100;
}

const tableHeaderClass = 'text-left text-[11px] font-black uppercase tracking-wide py-2 px-2 border-b';
const cellClass = 'text-xs py-1.5 px-2 border-b border-gray-100';
const tableHeaderClassSpacious = 'text-left text-xs font-black uppercase tracking-wide py-2.5 px-3 border-b';
const cellClassSpacious = 'text-sm py-2 px-3 border-b border-gray-100';

/**
 * Cash Drop Dashboard / Bank Drop style: Bills | Coins&Rolls, Sub Totals, Grand Total, optional Reconcile Delta (Adjusted total − Cash drop total).
 */
export function CashDenominationDisplay({
  record,
  title = 'Cash Drop Total',
  grayColor = '#64748B',
  magentaColor = '#AA056C',
  showVariance = false,
  variance,
  className = '',
  spacious = false,
  singleColumn = false,
}) {
  if (!record) return null;
  const billsSub = computeBillsSubtotal(record);
  const coinsSub = computeCoinsRollsSubtotal(record);
  const grand = Math.round((billsSub + coinsSub) * 100) / 100;
  const thClass = spacious ? tableHeaderClassSpacious : tableHeaderClass;
  const tdClass = spacious ? cellClassSpacious : cellClass;

  const renderTable = (denoms) => (
    <table className={`w-full border border-gray-200 rounded-lg overflow-hidden bg-white ${spacious ? 'text-sm' : 'text-sm'}`} style={spacious ? { minWidth: '200px' } : undefined}>
      <thead>
        <tr style={{ backgroundColor: '#f9fafb' }}>
          <th className={`${thClass} ${spacious ? 'min-w-[110px]' : ''}`} style={{ color: grayColor }}>Denomination</th>
          <th className={`${thClass} text-right ${spacious ? 'min-w-[56px]' : ''}`} style={{ color: grayColor }}>Count</th>
          <th className={`${thClass} text-right ${spacious ? 'min-w-[64px]' : ''}`} style={{ color: grayColor }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {denoms.map((d) => {
          const count = Number(record[d.name]) || 0;
          const amt = Math.round(count * d.value * 100) / 100;
          return (
            <tr key={d.name}>
              <td className={`${tdClass} ${spacious ? 'min-w-[110px]' : ''}`} style={{ color: grayColor }}>{d.display}</td>
              <td className={`${tdClass} text-right font-bold`}>{count}</td>
              <td className={`${tdClass} text-right font-bold`} style={{ color: magentaColor }}>
                ${amt.toFixed(2)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="font-black uppercase tracking-widest border-b pb-2" style={{ fontSize: spacious ? '16px' : '14px', color: grayColor }}>
        {title}
      </h4>
      <div className={`grid ${singleColumn ? 'grid-cols-1 gap-4' : `grid-cols-1 lg:grid-cols-2 ${spacious ? 'gap-6 lg:gap-8' : 'gap-4'}`}`}>
        <div className="min-w-0 overflow-x-auto space-y-2">
          <p className="text-xs font-bold uppercase mb-2" style={{ color: grayColor }}>Bills</p>
          {renderTable(BILLS_DENOMINATIONS)}
          <div className="flex justify-between items-center px-3 py-2.5 bg-gray-50 rounded-lg border text-sm font-bold" style={{ color: magentaColor }}>
            <span>Sub Total</span>
            <span>${billsSub.toFixed(2)}</span>
          </div>
        </div>
        <div className="min-w-0 overflow-x-auto space-y-2">
          <p className="text-xs font-bold uppercase mb-2" style={{ color: grayColor }}>Coins &amp; rolls</p>
          {renderTable(COINS_ROLLS_DENOMINATIONS)}
          <div className="flex justify-between items-center px-3 py-2.5 bg-gray-50 rounded-lg border text-sm font-bold" style={{ color: magentaColor }}>
            <span>Sub Total</span>
            <span>${coinsSub.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center px-3 py-2.5 rounded-lg border-2 font-black" style={{ borderColor: magentaColor, color: magentaColor, fontSize: '15px' }}>
        <span>Grand Total</span>
        <span>${grand.toFixed(2)}</span>
      </div>
      {showVariance && variance !== undefined && variance !== null && (
        <div className="flex justify-between px-3 py-2 rounded border text-sm font-bold" style={{ color: grayColor }}>
          <span>Reconcile Delta (Adjusted total − Cash drop total)</span>
          <span className={parseFloat(variance) !== 0 ? 'text-red-500' : ''}>${parseFloat(variance || 0).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Side-by-side: Cash drop breakdown | Counted/reconciled breakdown (same layout when recordCounted provided).
 */
export function CashDenominationDualDisplay({
  recordCashDrop,
  recordCounted,
  titleLeft = 'Cash Drop Total',
  titleRight = 'Counted Total',
  grayColor = '#64748B',
  magentaColor = '#AA056C',
  showRight = true,
  variance,
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <CashDenominationDisplay
        record={recordCashDrop}
        title={titleLeft}
        grayColor={grayColor}
        magentaColor={magentaColor}
        showVariance={!!variance && variance !== undefined}
        variance={variance}
      />
      {showRight && recordCounted && (
        <CashDenominationDisplay
          record={recordCounted}
          title={titleRight}
          grayColor={grayColor}
          magentaColor="#22C55E"
        />
      )}
    </div>
  );
}

/**
 * Reconcile-with-delta: Cash drop counts vs editable counted/adjusted counts (bills | coins layout).
 */
export function CashDenominationEditor({
  values,
  systemRecord,
  countedChecked,
  onCountedCheckedChange,
  onChange,
  targetTotal,
  onTotalChange,
  grayColor = '#64748B',
  magentaColor = '#AA056C',
  greenColor = '#22C55E',
  sectionTitle = 'Cash drop total',
  helpText = 'Tick ✓ to confirm each line: if Adj. count is empty, it fills with the cash drop count; if you already entered an Adj. count, ✓ keeps that value. Total below syncs to Counted Amount.',
  spacious = false,
}) {
  const record = values || {};
  const sys = systemRecord || {};
  const billsSub = computeBillsSubtotal(record);
  const coinsSub = computeCoinsRollsSubtotal(record);
  const grand = Math.round((billsSub + coinsSub) * 100) / 100;
  const thClass = spacious ? tableHeaderClassSpacious : tableHeaderClass;
  const tdClass = spacious ? cellClassSpacious : cellClass;

  useEffect(() => {
    if (typeof onTotalChange === 'function') onTotalChange(grand);
  }, [grand]);

  const handleCountedChange = (name, checked) => {
    onCountedCheckedChange?.(name, checked);
    if (checked) {
      const sysCount = Number(sys[name]) || 0;
      const current = record[name];
      // Empty adjusted count (null/undefined) → copy cash drop count; already has a value → keep it (validation only)
      const hasAdjustedEntry = current != null;
      if (!hasAdjustedEntry) {
        onChange(name, sysCount);
      }
    } else {
      onChange(name, null);
    }
  };

  /** Tick every ✓ in this group (bills or coins & rolls) using the same rules as a single checkbox. */
  const checkAllForDenoms = (denoms) => {
    denoms.forEach((d) => {
      if (!countedChecked?.[d.name]) {
        handleCountedChange(d.name, true);
      }
    });
  };

  const renderEditorTable = (denoms) => (
    <table
      className={`w-full border border-gray-200 rounded-lg overflow-hidden bg-white ${spacious ? 'text-sm' : 'text-xs md:text-sm min-w-0'}`}
      style={spacious ? { minWidth: '320px' } : undefined}
    >
      <thead>
        <tr style={{ backgroundColor: '#f3f4f6' }}>
          <th className={`${thClass} ${spacious ? 'min-w-[120px] text-left pl-3' : 'max-w-[100px]'}`} style={{ color: grayColor }}>Denomination</th>
          <th className={`${thClass} text-right whitespace-nowrap ${spacious ? 'px-2 min-w-[64px]' : 'px-1'}`} style={{ color: grayColor }}>Count</th>
          <th className={`${thClass} text-right whitespace-nowrap ${spacious ? 'px-2 min-w-[64px]' : 'px-1'}`} style={{ color: grayColor }}>Amount</th>
          <th className={`${thClass} text-center whitespace-nowrap ${spacious ? 'w-10 min-w-[40px]' : 'w-10 px-0'}`} style={{ color: grayColor }} title="Confirm count: empty Adj. count → use cash drop; with a number → keep it">✓</th>
          <th className={`${thClass} text-right whitespace-nowrap ${spacious ? 'px-2 min-w-[64px]' : 'px-1'}`} style={{ color: grayColor }}>Adj. Count</th>
          <th className={`${thClass} text-right whitespace-nowrap ${spacious ? 'px-2 min-w-[64px]' : 'px-1'}`} style={{ color: grayColor }}>Adj. Amount</th>
        </tr>
      </thead>
      <tbody>
        {denoms.map((d) => {
          const adjRaw = record[d.name];
          const adjCount = adjRaw == null ? 0 : Number(adjRaw);
          const sysCount = Number(sys[d.name]) || 0;
          const sysAmt = Math.round(sysCount * d.value * 100) / 100;
          const amt = Math.round(adjCount * d.value * 100) / 100;
          const checked = countedChecked?.[d.name];
          return (
            <tr key={d.name}>
              <td className={`${tdClass} ${spacious ? 'min-w-[120px] pl-3' : 'truncate max-w-[90px]'}`} style={{ color: grayColor }} title={d.display}>{d.display}</td>
              <td className={`${tdClass} text-right font-bold text-gray-500`}>{sysCount}</td>
              <td className={`${tdClass} text-right font-bold text-gray-500`}>${sysAmt.toFixed(2)}</td>
              <td className={`${tdClass} text-center px-0`}>
                <input
                  type="checkbox"
                  aria-label={`Confirm counted ${d.display}`}
                  className={spacious ? 'w-4 h-4' : 'w-3.5 h-3.5 md:w-4 md:h-4'}
                  style={{ accentColor: magentaColor }}
                  checked={!!checked}
                  onChange={(e) => handleCountedChange(d.name, e.target.checked)}
                />
              </td>
              <td className={`${tdClass} text-right ${spacious ? 'p-2' : 'p-1'}`}>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={!!checked}
                  className={`w-full min-w-0 border rounded text-right mx-auto block ${spacious ? 'max-w-[64px] p-1.5 text-sm' : 'max-w-[52px] p-0.5 text-xs'} ${checked ? 'bg-gray-100' : ''}`}
                  value={adjRaw == null ? '' : String(adjCount)}
                  onChange={(e) => {
                    if (checked) return;
                    const v = e.target.value.trim();
                    onChange(d.name, v === '' ? null : (parseInt(v, 10) || 0));
                  }}
                />
              </td>
              <td className={`${tdClass} text-right font-mono ${spacious ? 'text-xs' : 'text-[11px]'}`} style={{ color: magentaColor }}>${amt.toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-3 overflow-x-auto">
      <h4 className="font-black uppercase tracking-widest border-b pb-2" style={{ fontSize: spacious ? '16px' : '14px', color: magentaColor }}>
        {sectionTitle}
      </h4>
      <p className={spacious ? 'text-sm' : 'text-xs'} style={{ color: grayColor }}>
        {helpText}
      </p>
      <div className={`grid grid-cols-1 xl:grid-cols-2 ${spacious ? 'gap-8 xl:gap-12' : 'gap-4'}`}>
        <div className={`min-w-0 overflow-x-auto ${spacious ? 'pl-1 pr-2' : ''}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className={`font-bold uppercase ${spacious ? 'text-sm' : 'text-xs'}`} style={{ color: grayColor }}>Bills</p>
            <button
              type="button"
              onClick={() => checkAllForDenoms(BILLS_DENOMINATIONS)}
              className="font-bold uppercase rounded-lg border px-2.5 py-1 transition hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: '#f3f4f6', color: magentaColor, fontSize: spacious ? '12px' : '11px', borderColor: '#e5e7eb' }}
            >
              Check all ✓
            </button>
          </div>
          {renderEditorTable(BILLS_DENOMINATIONS)}
        </div>
        <div className={`min-w-0 overflow-x-auto ${spacious ? 'pl-2 pr-1' : ''}`}>
          <div className={`flex flex-wrap items-center justify-between gap-2 mb-2`}>
            <p className={`font-bold uppercase ${spacious ? 'text-sm' : 'text-xs'}`} style={{ color: grayColor }}>Coins &amp; rolls</p>
            <button
              type="button"
              onClick={() => checkAllForDenoms(COINS_ROLLS_DENOMINATIONS)}
              className="font-bold uppercase rounded-lg border px-2.5 py-1 transition hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: '#f3f4f6', color: magentaColor, fontSize: spacious ? '12px' : '11px', borderColor: '#e5e7eb' }}
            >
              Check all ✓
            </button>
          </div>
          {renderEditorTable(COINS_ROLLS_DENOMINATIONS)}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
        <div className="flex justify-between items-center px-3 py-2.5 bg-green-50 rounded-lg border text-sm font-bold" style={{ color: greenColor }}>
          <span>Sub Total (bills)</span>
          <span>${billsSub.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center px-3 py-2.5 bg-green-50 rounded-lg border text-sm font-bold" style={{ color: greenColor }}>
          <span>Sub Total (coins &amp; rolls)</span>
          <span>${coinsSub.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-2 items-center px-3 py-2.5 rounded-lg border-2 font-black" style={{ borderColor: greenColor, color: greenColor, fontSize: '14px' }}>
        <span>Adjusted total (bills + coins &amp; rolls)</span>
        <span>${grand.toFixed(2)}</span>
      </div>
      {targetTotal != null && targetTotal !== '' && Math.abs(grand - Number(targetTotal)) > 0.02 && grand > 0 && (
        <p className="text-sm text-red-600 font-bold">Must equal ${Number(targetTotal).toFixed(2)}</p>
      )}
    </div>
  );
}

export default CashDenominationDisplay;
