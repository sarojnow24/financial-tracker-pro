
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, FileSpreadsheet, Search, Upload, BarChart2, 
  PieChart as PieChartIcon, TrendingUp, LayoutGrid, Edit2, Trash2, Loader2,
  ArrowUpRight, ArrowDownRight, Filter, Scale, Calculator, X, Sparkles, Bot, Calendar, ChevronRight,
  List
} from 'lucide-react';
import { exportToExcel, exportToPDF, parseExcelImport } from '../services/exportService';
import { FlowBarChart, CategoryPieChart, SpendingHeatmap, TrendLineChart, CalendarChart } from '../components/Charts';
import { Transaction, Category } from '../types';
import { aiService } from '../services/aiService';

type FilterType = 'today' | 'week' | 'month' | 'custom' | 'all';
type ChartType = 'bar' | 'pie' | 'line' | 'heatmap' | 'calendar';
type ReportMode = 'standard' | 'advanced';
type ComparisonPreset = 'weekly' | 'monthly' | '3month' | '6month' | 'custom';

interface DrillDownState {
  type: 'category' | 'date';
  value: string; 
  label: string; 
}

interface ReportsProps {
  onEditTransaction: (t: Transaction) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const Reports: React.FC<ReportsProps> = ({ onEditTransaction }) => {
  const { transactions, categories, accounts, settings, formatPrice, t, importTransactions, deleteTransaction } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [reportMode, setReportMode] = useState<ReportMode>('standard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [chartType, setChartType] = useState<ChartType>('calendar');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);

  const [comparisonPreset, setComparisonPreset] = useState<ComparisonPreset>('monthly');
  const [customPeriodA, setCustomPeriodA] = useState(() => new Date().toISOString().slice(0, 7));
  const [customPeriodB, setCustomPeriodB] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  });

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Advanced Filter State
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState<string>('');

  const availableSubCategoriesForFilter = useMemo(() => {
    const cat = categories.find(c => c.id === selectedCategoryFilter);
    return cat?.subCategories || [];
  }, [selectedCategoryFilter, categories]);

  const smartFormatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (d.getTime() === today.getTime()) return t('today');
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const baseFilteredTransactions = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).filter(tx => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const cat = categories.find(c => c.id === tx.categoryId);
        const matches = (tx.note || '').toLowerCase().includes(term) || 
                       (tx.amount.toString().includes(term)) ||
                       (cat?.name.toLowerCase().includes(term));
        if (!matches) return false;
      }

      if (filterType === 'all') return true;
      const d = new Date(tx.date);
      const txMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      if (filterType === 'today') return txMidnight === todayMidnight;
      if (filterType === 'week') return txMidnight >= todayMidnight - (7 * 24 * 60 * 60 * 1000);
      if (filterType === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (filterType === 'custom' && customStart && customEnd) {
         const start = new Date(customStart).getTime();
         const end = new Date(customEnd).getTime();
         return txMidnight >= start && txMidnight <= end;
      }
      return true;
    });
  }, [transactions, searchTerm, filterType, customStart, customEnd, categories]);

  const displayedTransactions = useMemo(() => {
    if (!drillDown) return baseFilteredTransactions;
    return baseFilteredTransactions.filter(tx => {
      if (drillDown.type === 'category') {
        const cat = categories.find(c => c.id === tx.categoryId);
        const catName = cat ? t(cat.name) : (tx.subCategory || 'Uncategorized');
        return catName === drillDown.value;
      }
      const d = new Date(tx.date);
      const localYMD = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      return localYMD === drillDown.value;
    });
  }, [baseFilteredTransactions, drillDown, categories, t]);

  const chartData = useMemo(() => {
    if (chartType === 'pie') {
      const catMap: Record<string, number> = {};
      displayedTransactions.forEach(tx => {
        if (tx.type === 'transfer') return;
        const cat = categories.find(c => c.id === tx.categoryId);
        const displayKey = cat ? t(cat.name) : t('cat_uncategorized'); 
        catMap[displayKey] = (catMap[displayKey] || 0) + tx.amount;
      });
      return Object.entries(catMap).map(([name, value]) => ({ name, value }));
    } 
    const dateMap: Record<string, { income: number; expense: number; date: string }> = {};
    displayedTransactions.forEach(tx => {
       const d = new Date(tx.date);
       const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
       if (!dateMap[dateKey]) dateMap[dateKey] = { income: 0, expense: 0, date: tx.date };
       if (tx.type === 'income') dateMap[dateKey].income += tx.amount;
       else if (tx.type === 'expense') dateMap[dateKey].expense += tx.amount;
    });
    return Object.values(dateMap).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [displayedTransactions, chartType, categories, t]);

  const comparisonRanges = useMemo(() => {
    const now = new Date();
    const getStartOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
    const getEndOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    let startA: Date, endA: Date, startB: Date, endB: Date;
    let labelA = '', labelB = '';

    if (comparisonPreset === 'weekly') {
        endA = now; startA = new Date(now); startA.setDate(now.getDate() - 6);
        endB = new Date(startA); endB.setDate(startA.getDate() - 1);
        startB = new Date(endB); startB.setDate(endB.getDate() - 6);
        labelA = 'This Week'; labelB = 'Prev Week';
    } else if (comparisonPreset === 'monthly') {
        startA = getStartOfMonth(now); endA = now; labelA = 'This Month';
        startB = new Date(now); startB.setMonth(now.getMonth() - 1); startB.setDate(1);
        endB = new Date(startB.getFullYear(), startB.getMonth() + 1, 0); labelB = 'Last Month';
    } else {
        const dA = new Date(customPeriodA); startA = getStartOfMonth(dA); endA = getEndOfMonth(dA);
        const dB = new Date(customPeriodB); startB = getStartOfMonth(dB); endB = getEndOfMonth(dB);
        labelA = customPeriodA; labelB = customPeriodB;
    }
    return { rangeA: { start: startA, end: endA, label: labelA }, rangeB: { start: startB, end: endB, label: labelB } };
  }, [comparisonPreset, customPeriodA, customPeriodB]);

  const getPeriodMetrics = (range: { start: Date, end: Date }) => {
     const txs = transactions.filter(t => { 
       const d = new Date(t.date); 
       if (d < range.start || d > range.end) return false;
       if (selectedCategoryFilter) {
         if (t.categoryId !== selectedCategoryFilter) return false;
         if (selectedSubCategoryFilter && t.subCategory !== selectedSubCategoryFilter) return false;
       }
       return true;
     });
     const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
     const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
     const savings = income - expense;
     return { income, expense, savings, txs };
  };

  const metricsA = useMemo(() => getPeriodMetrics(comparisonRanges.rangeA), [transactions, comparisonRanges, selectedCategoryFilter, selectedSubCategoryFilter]);
  const metricsB = useMemo(() => getPeriodMetrics(comparisonRanges.rangeB), [transactions, comparisonRanges, selectedCategoryFilter, selectedSubCategoryFilter]);

  const breakdownData = useMemo(() => {
    const groupData = (txs: Transaction[]) => {
        const groups: Record<string, number> = {};
        // Renamed t to tx to avoid shadowing the t() translation function
        txs.filter(tx => tx.type === 'expense').forEach(tx => {
            let key = 'Uncategorized';
            if (selectedCategoryFilter) {
                 // If filtering by category, breakdown by subcategory
                 key = tx.subCategory || 'General';
            } else {
                 // Breakdown by category name
                 const c = categories.find(cat => cat.id === tx.categoryId);
                 if (c) key = t(c.name); 
            }
            groups[key] = (groups[key] || 0) + tx.amount;
        });
        return groups;
    };

    const groupA = groupData(metricsA.txs);
    const groupB = groupData(metricsB.txs);

    const allKeys = Array.from(new Set([...Object.keys(groupA), ...Object.keys(groupB)]));
    
    return allKeys.map(key => ({
        name: key,
        amountA: groupA[key] || 0,
        amountB: groupB[key] || 0,
        diff: (groupA[key] || 0) - (groupB[key] || 0)
    })).sort((a, b) => b.amountA - a.amountA);
  }, [metricsA, metricsB, selectedCategoryFilter, categories, t]);

  const handleHeatmapClick = (dateStr: string) => {
    if (drillDown?.type === 'date' && drillDown.value === dateStr) { setDrillDown(null); } 
    else { setDrillDown({ type: 'date', value: dateStr, label: dateStr }); }
  };

  const handlePerformDelete = async () => {
    if (!selectedTx || isDeleting) return;
    setIsDeleting(true);
    await deleteTransaction(selectedTx.id);
    setSelectedTx(null);
    setIsDeleting(false);
  };

  const getTopCategories = (txs: Transaction[]) => {
      const catTotals: Record<string, number> = {};
      txs.filter(t => t.type === 'expense').forEach(t => {
          const n = categories.find(c => c.id === t.categoryId)?.name || 'Other';
          catTotals[n] = (catTotals[n] || 0) + t.amount;
      });
      return Object.entries(catTotals)
          .sort((a,b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, amount]) => ({ name, amount }));
  };

  const handleGenerateAiReport = async () => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
        let currentData, previousData = null;

        if (reportMode === 'advanced') {
            const fmtDate = (d: Date) => d.toLocaleDateString();
            currentData = {
                label: comparisonRanges.rangeA.label,
                dateRange: `${fmtDate(comparisonRanges.rangeA.start)} - ${fmtDate(comparisonRanges.rangeA.end)}`,
                income: metricsA.income,
                expense: metricsA.expense,
                topCategories: getTopCategories(metricsA.txs)
            };
            previousData = {
                label: comparisonRanges.rangeB.label,
                dateRange: `${fmtDate(comparisonRanges.rangeB.start)} - ${fmtDate(comparisonRanges.rangeB.end)}`,
                income: metricsB.income,
                expense: metricsB.expense
            };
        } else {
            const income = displayedTransactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
            const expense = displayedTransactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
            
            let dateRangeStr = 'All Time';
            if (filterType === 'today') dateRangeStr = 'Today';
            else if (filterType === 'week') dateRangeStr = 'Last 7 Days';
            else if (filterType === 'month') dateRangeStr = 'This Month';
            
            currentData = {
                label: filterType === 'all' ? 'All Time' : t(filterType),
                dateRange: dateRangeStr,
                income: income,
                expense: expense,
                topCategories: getTopCategories(displayedTransactions)
            };
        }

        const result = await aiService.getReportAnalysis(
            currentData,
            previousData,
            settings.currency,
            settings.language
        );
        setAiAnalysis(result);
    } catch(e) {
        setAiAnalysis("Analysis Unavailable.");
    } finally {
        setIsAiLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 relative max-w-lg mx-auto">
      <div className="flex flex-col gap-3 pt-1 px-1">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">{t('reports')}</h1>
            <div className="flex gap-1.5">
              <button onClick={handleGenerateAiReport} className="w-9 h-9 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl border border-indigo-100 dark:border-indigo-800 active:scale-95 transition-all shadow-sm">
                <Bot size={18} />
              </button>
              <input type="file" ref={fileInputRef} onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) { 
                    try { 
                      const result = await parseExcelImport(file, categories, accounts);
                      importTransactions(result);
                    } catch (err) { 
                      alert('Import failed'); 
                    } 
                  }
              }} className="hidden" accept=".xlsx,.xls" />
              <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-xl border border-gray-100 dark:border-gray-700 active:scale-95 transition-all shadow-sm"><Upload size={18}/></button>
              <button onClick={() => exportToExcel({ transactions: displayedTransactions, accounts, categories, currency: settings.currency, dateRangeTitle: filterType })} className="w-9 h-9 flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl border border-green-100 dark:border-green-900/30 active:scale-95 transition-all shadow-sm"><FileSpreadsheet size={18}/></button>
              <button onClick={() => exportToPDF({ transactions: displayedTransactions, accounts, categories, currency: settings.currency, dateRangeTitle: filterType })} className="w-9 h-9 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl border border-red-100 dark:border-red-900/30 active:scale-95 transition-all shadow-sm"><FileText size={18}/></button>
            </div>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl shadow-inner border border-gray-100 dark:border-gray-800">
             <button onClick={() => setReportMode('standard')} className={`flex-1 py-2 text-[11px] font-black uppercase rounded-xl transition-all ${reportMode === 'standard' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-md' : 'text-gray-400'}`}>Standard</button>
             <button onClick={() => setReportMode('advanced')} className={`flex-1 py-2 text-[11px] font-black uppercase rounded-xl transition-all ${reportMode === 'advanced' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-md' : 'text-gray-400'}`}>Advanced</button>
          </div>
      </div>

      {/* AI Report Modal */}
      {(aiAnalysis || isAiLoading) && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-xl border border-indigo-100 dark:border-indigo-900/30 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Sparkles size={100} /></div>
             <div className="flex justify-between items-start mb-4 relative z-10">
                 <div className="flex items-center gap-3">
                     <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 rounded-xl"><Bot size={20}/></div>
                     <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">AI Report Analysis</h3>
                 </div>
                 <button onClick={() => setAiAnalysis(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
             </div>
             {isAiLoading ? (
                 <div className="flex flex-col items-center justify-center py-8 gap-3">
                     <Loader2 size={32} className="animate-spin text-indigo-500"/>
                     <p className="text-xs font-bold text-indigo-400 animate-pulse">Crunching numbers...</p>
                 </div>
             ) : (
                 <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: aiAnalysis || '' }} />
             )}
        </div>
      )}

      <div className="space-y-4">
        {reportMode === 'standard' && (
          <>
             <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-gray-300 dark:text-gray-600" size={18} />
                    <input type="text" placeholder={t('findTransaction')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500 rounded-[1.25rem] text-sm font-bold outline-none dark:text-white transition-all shadow-inner" />
                </div>
                
                <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1.5 rounded-[1.5rem] overflow-x-auto no-scrollbar gap-1.5 border border-gray-100 dark:border-gray-800">
                  {['all', 'today', 'week', 'month', 'custom'].map(opt => (
                    <button key={opt} onClick={() => setFilterType(opt as any)} className={`flex-1 flex items-center justify-center px-4 py-3 rounded-2xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${filterType === opt ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-md border border-gray-50 dark:border-gray-700' : 'text-gray-400 dark:text-gray-500'}`}>
                      {t(opt)}
                    </button>
                  ))}
                </div>
                {filterType === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="p-3.5 bg-gray-50 dark:bg-gray-900 border rounded-2xl text-xs font-bold outline-none dark:text-white" />
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="p-3.5 bg-gray-50 dark:bg-gray-900 border rounded-2xl text-xs font-bold outline-none dark:text-white" />
                  </div>
                )}
            </div>

            <section className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
               <div className="flex items-center justify-between px-1">
                 <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Visual Analytics</h3>
                 <div className="flex gap-2 bg-gray-50 dark:bg-gray-900/50 p-1 rounded-2xl overflow-x-auto no-scrollbar">
                   <button onClick={() => setChartType('calendar')} className={`p-2 rounded-xl transition-all ${chartType === 'calendar' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400'}`}><Calendar size={16}/></button>
                   <button onClick={() => setChartType('bar')} className={`p-2 rounded-xl transition-all ${chartType === 'bar' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400'}`}><BarChart2 size={16}/></button>
                   <button onClick={() => setChartType('pie')} className={`p-2 rounded-xl transition-all ${chartType === 'pie' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400'}`}><PieChartIcon size={16}/></button>
                   <button onClick={() => setChartType('line')} className={`p-2 rounded-xl transition-all ${chartType === 'line' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400'}`}><TrendingUp size={16}/></button>
                   <button onClick={() => setChartType('heatmap')} className={`p-2 rounded-xl transition-all ${chartType === 'heatmap' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-400'}`}><LayoutGrid size={16}/></button>
                 </div>
               </div>
               <div className="h-64 w-full bg-gray-50 dark:bg-gray-900/50 rounded-[2rem] p-4 border border-gray-100 dark:border-gray-800 shadow-inner overflow-hidden">
                  {chartType === 'calendar' ? (
                    <CalendarChart data={chartData} colors={COLORS} currency={settings.currency} isDark={settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)} onClick={d => setDrillDown({type:'date', value: d.date, label: d.date})} />
                  ) : chartType === 'pie' ? (
                    <CategoryPieChart data={chartData} colors={COLORS} currency={settings.currency} isDark={settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)} onClick={d => setDrillDown({type:'category', value: d.name, label: d.name})} />
                  ) : chartType === 'heatmap' ? (
                    <SpendingHeatmap transactions={baseFilteredTransactions} currency={settings.currency} isDark={settings.theme === 'dark'} onClick={handleHeatmapClick} />
                  ) : chartType === 'line' ? (
                    <TrendLineChart data={chartData} colors={COLORS} currency={settings.currency} isDark={settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)} onClick={d => setDrillDown({type:'date', value: d.date, label: d.date})} />
                  ) : (
                    <FlowBarChart data={chartData} colors={COLORS} currency={settings.currency} isDark={settings.theme === 'dark'} onClick={d => setDrillDown({type:'date', value: d.date, label: d.date})} />
                  )}
               </div>
            </section>
            
            <section className="space-y-3">
               <div className="flex items-center justify-between ml-2">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Activity ({displayedTransactions.length})</h3>
                  {drillDown && <button onClick={() => setDrillDown(null)} className="text-[9px] font-black text-blue-600 uppercase">Clear Filter</button>}
               </div>
               <div className="space-y-2.5">
                  {displayedTransactions.map(tx => (
                    <div key={tx.id} onClick={() => setSelectedTx(tx)} className="bg-white dark:bg-gray-800 p-5 rounded-[1.75rem] border border-gray-100 dark:border-gray-700 flex justify-between items-center shadow-sm cursor-pointer active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${tx.type === 'income' ? 'bg-green-500' : tx.type === 'expense' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                            <div className="min-w-0">
                                <p className="font-black text-[15px] text-gray-800 dark:text-gray-100 truncate leading-tight">
                                    {categories.find(c => c.id === tx.categoryId)?.name ? t(categories.find(c => c.id === tx.categoryId)!.name) : t(tx.type)}
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1.5 uppercase tracking-tight">{smartFormatDate(tx.date)} {tx.note ? `• ${tx.note}` : ''}</p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                            <p className={`font-black text-[15px] leading-none ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.type === 'expense' ? '-' : '+'}{formatPrice(tx.amount)}
                            </p>
                        </div>
                    </div>
                  ))}
               </div>
            </section>
          </>
        )}

        {reportMode === 'advanced' && (
           <div className="space-y-4">
             {/* Filter Section */}
             <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
                 <div className="flex items-center gap-2 px-1">
                    <Filter size={16} className="text-blue-500" />
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Filter Analysis</h3>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Category</label>
                        <select 
                            value={selectedCategoryFilter} 
                            onChange={e => { setSelectedCategoryFilter(e.target.value); setSelectedSubCategoryFilter(''); }}
                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[10px] font-bold dark:text-white outline-none"
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{t(c.name)}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Sub-Category</label>
                        <select 
                            value={selectedSubCategoryFilter} 
                            onChange={e => setSelectedSubCategoryFilter(e.target.value)}
                            disabled={!selectedCategoryFilter}
                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[10px] font-bold dark:text-white outline-none disabled:opacity-50"
                        >
                            <option value="">All</option>
                            {availableSubCategoriesForFilter.map(sub => <option key={sub} value={sub}>{t(sub)}</option>)}
                        </select>
                    </div>
                 </div>
             </div>

             <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-5">
                <div className="flex items-center gap-2">
                    <Scale size={18} className="text-purple-600" />
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Local Comparison</h3>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1.5 rounded-2xl overflow-x-auto no-scrollbar gap-1">
                   {['weekly', 'monthly', 'custom'].map(opt => (
                     <button key={opt} onClick={() => setComparisonPreset(opt as any)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${comparisonPreset === opt ? 'bg-white dark:bg-gray-800 text-purple-600 shadow-sm' : 'text-gray-400'}`}>{opt}</button>
                   ))}
                </div>
                {comparisonPreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                     <input type="month" value={customPeriodA} onChange={e => setCustomPeriodA(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border rounded-xl text-xs font-black outline-none" />
                     <input type="month" value={customPeriodB} onChange={e => setCustomPeriodB(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border rounded-xl text-xs font-black outline-none" />
                  </div>
                )}
             </div>

             <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-600 text-white p-5 rounded-[2rem] shadow-xl">
                    <p className="text-[10px] font-bold opacity-80 uppercase mb-1">{comparisonRanges.rangeA.label}</p>
                    <div className="space-y-3">
                        <div><p className="text-[9px] uppercase opacity-70">Income</p><p className="text-sm font-black">{formatPrice(metricsA.income)}</p></div>
                        <div><p className="text-[9px] uppercase opacity-70">Expense</p><p className="text-sm font-black">{formatPrice(metricsA.expense)}</p></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{comparisonRanges.rangeB.label}</p>
                    <div className="space-y-3">
                        <div><p className="text-[9px] uppercase text-gray-400">Income</p><p className="text-sm font-black text-gray-800 dark:text-white">{formatPrice(metricsB.income)}</p></div>
                        <div><p className="text-[9px] uppercase text-gray-400">Expense</p><p className="text-sm font-black text-gray-800 dark:text-white">{formatPrice(metricsB.expense)}</p></div>
                    </div>
                </div>
             </div>

             {/* CATEGORY BREAKDOWN SECTION */}
             <div className="bg-white dark:bg-gray-800 p-5 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                <div className="flex items-center gap-2 px-1">
                   <List size={18} className="text-blue-500" />
                   <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">
                       {selectedCategoryFilter ? t('subCategories') : t('categories')} Breakdown
                   </h3>
                </div>
                <div className="space-y-3">
                   {breakdownData.map(item => {
                       const maxVal = Math.max(item.amountA, item.amountB) || 1;
                       return (
                         <div key={item.name} className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                             <div className="flex justify-between items-center">
                                 <span className="text-xs font-black text-gray-800 dark:text-gray-200">{item.name}</span>
                                 <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${item.diff > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                                    {item.diff > 0 ? '▲' : '▼'}{formatPrice(Math.abs(item.diff))}
                                 </div>
                             </div>
                             
                             {/* Bar A (Current) */}
                             <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold text-blue-500 uppercase">
                                   <span>{comparisonRanges.rangeA.label}</span>
                                   <span>{formatPrice(item.amountA)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                   <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (item.amountA / maxVal) * 100)}%` }}></div>
                                </div>
                             </div>
                             
                             {/* Bar B (Previous) */}
                             <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase">
                                   <span>{comparisonRanges.rangeB.label}</span>
                                   <span>{formatPrice(item.amountB)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                   <div className="bg-gray-400 dark:bg-gray-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (item.amountB / maxVal) * 100)}%` }}></div>
                                </div>
                             </div>
                         </div>
                       );
                   })}
                   {breakdownData.length === 0 && (
                       <div className="text-center py-6 text-gray-400">
                           <p className="text-xs font-bold">No expenses found for this period.</p>
                       </div>
                   )}
                </div>
             </div>

             <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Calculator size={18} className="text-orange-500" />
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Variance</h3>
                </div>
                <div className="space-y-4">
                    {[
                      {label: 'Income Change', val: metricsA.income - metricsB.income, inverse: false},
                      {label: 'Expense Change', val: metricsA.expense - metricsB.expense, inverse: true}
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{item.label}</span>
                        <div className={`text-[10px] font-black ${item.val > 0 ? (item.inverse ? 'text-red-500' : 'text-green-500') : 'text-gray-400'}`}>
                           {item.val > 0 ? '+' : ''}{formatPrice(item.val)}
                        </div>
                      </div>
                    ))}
                </div>
             </div>
           </div>
        )}
      </div>

      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !isDeleting && setSelectedTx(null)}>
           <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-[2.5rem] p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 shadow-2xl relative" onClick={e => e.stopPropagation()}>
              
              <div className="flex flex-col items-center gap-2">
                 <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full opacity-60"></div>
                 <div className="absolute top-6 right-6">
                    <button onClick={() => setSelectedTx(null)} className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={18}/></button>
                 </div>
              </div>

              <div className="flex flex-col items-center justify-center pt-2">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-sm ${selectedTx.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {selectedTx.type === 'income' ? <ArrowUpRight size={32} /> : <ArrowDownRight size={32} />}
                  </div>
                  <h2 className={`text-3xl font-black mb-1 ${selectedTx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {selectedTx.type === 'income' ? '+' : '-'}{formatPrice(selectedTx.amount)}
                  </h2>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {categories.find(c => c.id === selectedTx.categoryId)?.name ? t(categories.find(c => c.id === selectedTx.categoryId)!.name) : t(selectedTx.type)}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-900/50 px-4 py-2 rounded-xl">
                      <div className="flex items-center gap-1.5"><Calendar size={12}/> {smartFormatDate(selectedTx.date)}</div>
                      {selectedTx.note && <div className="w-1 h-1 bg-gray-300 rounded-full"></div>}
                      {selectedTx.note && <div className="truncate max-w-[120px]">{selectedTx.note}</div>}
                  </div>
              </div>

              <div className="space-y-3 mt-4">
                  <button 
                    disabled={isDeleting}
                    onClick={() => { onEditTransaction(selectedTx); setSelectedTx(null); }}
                    className="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/10 active:scale-[0.98] transition-all group"
                  >
                      <div className="p-3 bg-white dark:bg-gray-800 text-blue-600 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                          <Edit2 size={20} />
                      </div>
                      <div className="text-left flex-1">
                          <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Modify Transaction</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Change Amount, Date, or Note</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </button>

                  <button 
                    disabled={isDeleting}
                    onClick={handlePerformDelete}
                    className="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-transparent hover:border-red-100 dark:hover:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-[0.98] transition-all group"
                  >
                      <div className="p-3 bg-white dark:bg-gray-800 text-red-500 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                          {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                      </div>
                      <div className="text-left flex-1">
                          <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Delete Transaction</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Remove record permanently</p>
                      </div>
                      {!isDeleting && <ChevronRight size={18} className="text-gray-300 group-hover:text-red-500 transition-colors" />}
                  </button>
              </div>

           </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
