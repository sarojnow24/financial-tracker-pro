
import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Activity, Heart, Zap, ArrowUpRight, ArrowDownRight, ArrowRightLeft, LayoutGrid,
  ChevronRight, List, Edit2, Trash2, Loader2, Target, X, Bot, Sparkles, Calendar
} from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { FinancialOverviewChart } from '../components/Charts';
import { aiService } from '../services/aiService';

interface DashboardProps {
  onEditTransaction: (t: Transaction) => void;
  onQuickAction: (type: TransactionType) => void;
}

const DASHBOARD_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const Dashboard: React.FC<DashboardProps> = ({ onEditTransaction, onQuickAction }) => {
  const { 
    transactions, accounts, settings, budget, categoryBudgets, formatPrice, 
    deleteTransaction, categories, t, getAccountBalance
  } = useApp();
  
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const activeAccounts = useMemo(() => {
    return accounts
      .map(acc => ({ ...acc, balance: getAccountBalance(acc.id) }))
      .filter(acc => Math.abs(acc.balance) >= 0.01);
  }, [accounts, getAccountBalance]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Last Month Same Period Calculation
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // Handle edge cases where last month has fewer days (e.g., March 30 -> Feb 28)
    const daysInLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const compareDay = Math.min(currentDay, daysInLastMonth);
    const endOfLastMonthSamePeriod = new Date(now.getFullYear(), now.getMonth() - 1, compareDay, 23, 59, 59);

    const monthlyExpenses = transactions
      .filter(tx => tx.type === 'expense' && new Date(tx.date) >= startOfMonth)
      .reduce((s, tx) => s + tx.amount, 0);

    const monthlyIncome = transactions
      .filter(tx => tx.type === 'income' && new Date(tx.date) >= startOfMonth)
      .reduce((s, tx) => s + tx.amount, 0);

    const lastMonthSamePeriodExpenses = transactions
      .filter(tx => {
          if (tx.type !== 'expense') return false;
          const d = new Date(tx.date);
          return d >= startOfLastMonth && d <= endOfLastMonthSamePeriod;
      })
      .reduce((s, tx) => s + tx.amount, 0);

    // Total Balance (Cumulative)
    const combinedTotal = transactions.reduce((acc, tx) => {
        if (tx.type === 'income') return acc + tx.amount;
        if (tx.type === 'expense') return acc - tx.amount;
        return acc;
    }, 0);

    const chartDataMap: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'expense' && new Date(tx.date) >= startOfMonth)
      .forEach(tx => {
        const catName = categories.find(c => c.id === tx.categoryId)?.name || 'Other';
        chartDataMap[catName] = (chartDataMap[catName] || 0) + tx.amount;
    });

    const spentByCategory: Record<string, number> = {};
    transactions
      .filter(tx => tx.type === 'expense' && new Date(tx.date) >= startOfMonth)
      .forEach(tx => {
        if (tx.categoryId) {
          spentByCategory[tx.categoryId] = (spentByCategory[tx.categoryId] || 0) + tx.amount;
        }
      });

    const recent = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);
    
    let remainingForChart = 0;
    if (budget > 0) {
        remainingForChart = Math.max(0, budget - monthlyExpenses);
    } else {
        remainingForChart = Math.max(0, monthlyIncome - monthlyExpenses);
    }
    
    if (budget > 0 && monthlyExpenses > budget) {
        remainingForChart = budget - monthlyExpenses; 
    }

    return {
      monthlyExpenses, 
      monthlyIncome, 
      lastMonthSamePeriodExpenses,
      combinedTotal,
      recent,
      chartData: Object.entries(chartDataMap).map(([name, value]) => ({ name: t(name), value })),
      remainingForChart,
      health: Math.round(budget > 0 ? Math.max(0, 100 - (monthlyExpenses / budget * 100)) : 100),
      spentByCategory,
      currentDay
    };
  }, [transactions, budget, categories, t]);

  const handleGenerateInsights = async () => {
    setIsAiLoading(true);
    setAiInsight(null);
    try {
      const insight = await aiService.getDashboardInsights(
        stats.recent, 
        categories, 
        budget,
        stats.monthlyExpenses, // Pass current month expenses
        stats.lastMonthSamePeriodExpenses, // Pass last month expenses (same timeframe)
        stats.combinedTotal, // Pass Total Balance
        stats.currentDay,
        settings.currency,
        settings.language
      );
      setAiInsight(insight);
    } catch (e) {
      setAiInsight("Unable to connect to AI service.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const smartFormatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (d.getTime() === today.getTime()) return t('today');
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (d.getTime() === yesterday.getTime()) return t('yesterday');
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handlePerformDelete = async () => {
    if (!selectedTx || isDeleting) return;
    setIsDeleting(true);
    await deleteTransaction(selectedTx.id);
    setSelectedTx(null);
    setIsDeleting(false);
  };

  return (
    <div className="p-3 space-y-3 pb-24 relative max-w-lg mx-auto overflow-x-hidden">
      <header className="flex items-center justify-between pt-2 px-1">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none">{t('appTitle')}</h1>
        <div className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex items-center justify-center text-gray-400 shadow-sm active:scale-90 transition-transform cursor-pointer" onClick={() => window.location.hash = '#/settings'}>
          <LayoutGrid size={22} />
        </div>
      </header>

      {settings.showBudgetOnDashboard && (
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex divide-x divide-gray-100 dark:divide-gray-700">
            {[
              { label: t('balance'), value: stats.combinedTotal, color: 'text-gray-900 dark:text-white' },
              { label: t('income'), value: stats.monthlyIncome, color: 'text-green-600' },
              { label: t('expense'), value: stats.monthlyExpenses, color: 'text-red-600' }
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center justify-center py-4 px-2 text-center">
                <span className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 leading-none">{item.label}</span>
                <span className={`text-lg font-black leading-none ${item.color}`}>
                  {formatPrice(item.value)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Insights Card */}
      <section className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-4 text-white shadow-lg border border-white/10 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-10"><Bot size={80} /></div>
         <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-yellow-300" />
                  <h3 className="text-xs font-black uppercase tracking-widest">{t('aiInsights')}</h3>
               </div>
               {!aiInsight && !isAiLoading && (
                 <button onClick={handleGenerateInsights} className="bg-white/20 hover:bg-white/30 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wide backdrop-blur-sm">
                   {t('getInsights')}
                 </button>
               )}
            </div>
            
            {isAiLoading ? (
               <div className="flex items-center gap-2 py-2">
                  <Loader2 size={18} className="animate-spin text-white/70" />
                  <span className="text-xs font-medium text-white/70">{t('analyzing')}</span>
               </div>
            ) : aiInsight ? (
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="text-sm font-medium leading-relaxed text-indigo-50 whitespace-pre-line space-y-2">
                      {aiInsight.split('\n').filter(line => line.trim().length > 0).map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                  </div>
                  <button onClick={handleGenerateInsights} className="mt-3 text-[9px] font-black uppercase text-indigo-200 hover:text-white flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                    <Sparkles size={10} /> Refresh Analysis
                  </button>
               </div>
            ) : (
               <p className="text-xs text-indigo-100 opacity-80">Compare this month's spending pace against last month.</p>
            )}
         </div>
      </section>

      {settings.showAccountsOnDashboard && activeAccounts.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
           <div className="flex divide-x divide-gray-100 dark:divide-gray-700 overflow-x-auto no-scrollbar">
             {activeAccounts.map(acc => (
               <div key={acc.id} className="flex-none min-w-[120px] flex flex-col items-center justify-center py-3.5 px-5 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                  <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 leading-none truncate w-full text-center">{t(acc.name)}</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white leading-none">{formatPrice(acc.balance)}</span>
               </div>
             ))}
           </div>
        </section>
      )}

      <div className="space-y-3">
        {settings.showFinancialOverviewChart && stats.chartData.length > 0 && (
          <section className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
             <div className="flex items-center gap-2 mb-3 px-1">
               <Zap size={16} className="text-blue-500" />
               <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] leading-none">{t('dataInsights')}</h3>
             </div>
             <div className="h-44 w-full">
                <FinancialOverviewChart 
                  data={stats.chartData} 
                  colors={DASHBOARD_COLORS} 
                  currency={settings.currency} 
                  isDark={settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)} 
                  remaining={stats.remainingForChart} 
                  totalIncome={stats.monthlyIncome} 
                  t={t} 
                />
             </div>
          </section>
        )}

        {settings.showQuickActionsOnDashboard && (
          <section className="grid grid-cols-4 gap-2.5 px-0.5">
            {[
              { icon: ArrowDownRight, label: t('income'), type: 'income', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
              { icon: ArrowUpRight, label: t('expense'), type: 'expense', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
              { icon: ArrowRightLeft, label: t('transfer'), type: 'transfer', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { icon: List, label: t('all'), type: 'reports', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' }
            ].map((action, i) => (
              <button key={i} onClick={() => action.type === 'reports' ? (window.location.hash = '#/reports') : onQuickAction(action.type as any)} className="flex flex-col items-center group">
                <div className={`w-full py-3 flex items-center justify-center rounded-2xl ${action.bg} ${action.color} border border-transparent active:scale-95 transition-all shadow-sm mb-1.5`}><action.icon size={22} /></div>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter leading-none">{action.label}</span>
              </button>
            ))}
          </section>
        )}

        {/* Budget Health - Only shows if Budget is set (>0) */}
        {settings.showFinancialHealthScore && budget > 0 && (
          <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 text-white flex items-center justify-between shadow-lg border border-white/10 animate-in zoom-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner"><Heart size={20} fill="currentColor" /></div>
              <div>
                <p className="text-[11px] font-black text-blue-100 uppercase tracking-widest mb-0.5 leading-none">{t('budgetHealth')}</p>
                <p className="text-2xl font-black leading-none">{stats.health}%</p>
              </div>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-100 leading-none">{stats.health > 70 ? t('safe') : t('alert')}</p>
            </div>
          </section>
        )}

        {settings.showBudgetOnDashboard && budget > 0 && (
          <section className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-2.5 px-1">
               <div className="flex items-center gap-2">
                  <Target size={16} className="text-blue-500" />
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">{t('monthlyForecast')}</span>
               </div>
               <span className="text-sm font-black text-gray-900 dark:text-white">{formatPrice(stats.monthlyExpenses)} / {formatPrice(budget)}</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden shadow-inner">
               <div 
                 className={`h-full transition-all duration-1000 ${stats.health < 20 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]'}`} 
                 style={{ width: `${Math.min(100, (stats.monthlyExpenses / budget) * 100)}%` }} 
               />
            </div>
          </section>
        )}

        {settings.showCategoryBudgetsOnDashboard && categoryBudgets.length > 0 && (
          <section className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
             <div className="flex items-center gap-2 px-1">
                <Target size={16} className="text-purple-500" />
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">{t('categoryBudgets')}</h3>
             </div>
             <div className="space-y-3">
                {categoryBudgets.map(cb => {
                   const cat = categories.find(c => c.id === cb.categoryId);
                   if (!cat) return null;
                   const spent = stats.spentByCategory[cat.id] || 0;
                   const pct = Math.min(100, (spent / cb.amount) * 100);
                   
                   return (
                      <div key={cb.categoryId}>
                         <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-gray-700 dark:text-gray-200">{t(cat.name)}</span>
                            <span className={spent > cb.amount ? "text-red-500" : "text-gray-500"}>{formatPrice(spent)} / {formatPrice(cb.amount)}</span>
                         </div>
                         <div className="h-2 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${spent > cb.amount ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }}></div>
                         </div>
                      </div>
                   )
                })}
             </div>
          </section>
        )}

        <section className="space-y-3 pb-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-500" />
              <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">{t('recentActivity')}</h3>
            </div>
            <button onClick={() => window.location.hash = '#/reports'} className="text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1">{t('seeAll')} <ChevronRight size={14} /></button>
          </div>
          <div className="space-y-2">
             {stats.recent.map(tx => {
                const cat = categories.find(c => c.id === tx.categoryId);
                const categoryLabel = cat?.name ? t(cat.name) : (tx.type === 'transfer' ? t('transfer') : t(tx.type));
                const displayLabel = tx.subCategory ? `${categoryLabel} > ${t(tx.subCategory)}` : categoryLabel;

                return (
                  <div key={tx.id} onClick={() => setSelectedTx(tx)} className="bg-white dark:bg-gray-800 py-3.5 px-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center shadow-sm active:scale-[0.99] transition-all cursor-pointer group">
                      <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${tx.type === 'income' ? 'bg-green-500' : tx.type === 'expense' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                          <div className="min-w-0">
                              <p className="font-black text-[13px] text-gray-800 dark:text-gray-100 truncate leading-tight group-hover:text-blue-600 transition-colors">
                                  {displayLabel}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight leading-none">{smartFormatDate(tx.date)}</span>
                                {tx.note && <span className="text-[10px] text-gray-400 truncate max-w-[120px] font-medium leading-none">• {tx.note}</span>}
                              </div>
                          </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                          <p className={`font-black text-sm leading-none ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{tx.type === 'expense' ? '-' : '+'}{formatPrice(tx.amount)}</p>
                      </div>
                  </div>
                );
             })}
          </div>
        </section>
      </div>

      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !isDeleting && setSelectedTx(null)}>
           <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-[2.5rem] p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 shadow-2xl relative" onClick={e => e.stopPropagation()}>
              
              {/* Drag Handle & Header */}
              <div className="flex flex-col items-center gap-2">
                 <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full opacity-60"></div>
                 <div className="absolute top-6 right-6">
                    <button onClick={() => setSelectedTx(null)} className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={18}/></button>
                 </div>
              </div>

              {/* Transaction Summary Card */}
              <div className="flex flex-col items-center justify-center pt-2">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-sm ${selectedTx.type === 'income' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {selectedTx.type === 'income' ? <ArrowDownRight size={32} /> : <ArrowUpRight size={32} />}
                  </div>
                  <h2 className={`text-3xl font-black mb-1 ${selectedTx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {selectedTx.type === 'income' ? '+' : '-'}{formatPrice(selectedTx.amount)}
                  </h2>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {categories.find(c => c.id === selectedTx.categoryId)?.name ? t(categories.find(c => c.id === selectedTx.categoryId)!.name) : t(selectedTx.type)}
                  </p>
                  
                  {/* Meta Details */}
                  <div className="flex items-center gap-3 mt-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-900/50 px-4 py-2 rounded-xl">
                      <div className="flex items-center gap-1.5"><Calendar size={12}/> {smartFormatDate(selectedTx.date)}</div>
                      {selectedTx.note && <div className="w-1 h-1 bg-gray-300 rounded-full"></div>}
                      {selectedTx.note && <div className="truncate max-w-[120px]">{selectedTx.note}</div>}
                  </div>
              </div>

              {/* Actions List */}
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

export default Dashboard;
