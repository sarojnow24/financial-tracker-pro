import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Trash2, Plus, Globe, DollarSign, LayoutDashboard, ChevronRight, ArrowLeft, X, 
  RotateCcw, ToggleLeft, ToggleRight, Banknote, CreditCard, Check, Edit2, Target, Palette,
  Sun, Moon, Monitor, Type, ChevronDown, Tags, RefreshCcw
} from 'lucide-react';
import { LANGUAGE_NAMES } from '../constants';

const Settings: React.FC = () => {
  const { 
    settings, updateSettings, budget, updateBudget, categoryBudgets, updateCategoryBudget, categories,
    addCategory, updateCategory, deleteCategory, accounts, addAccount, updateAccountName, deleteAccount, 
    getAccountBalance, availableLanguages, formatPrice, resetPreferences, resetSettings, t 
  } = useApp();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeSubView = searchParams.get('view') || 'main';

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expandingCategoryId, setExpandingCategoryId] = useState<string | null>(null);
  const [newSubCategory, setNewSubCategory] = useState('');

  // Helper to handle back navigation
  const handleBack = () => {
    navigate(-1);
  };

  // Helper to navigate to subview
  const navigateTo = (view: string) => {
    setSearchParams({ view });
  };

  const renderHeader = (title: string) => (
    <div className="flex items-center gap-3 mb-3 animate-in slide-in-from-left duration-300 px-1">
       <button onClick={handleBack} className="p-2 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-lg active:scale-90 text-gray-500 dark:text-gray-400 transition-all hover:bg-gray-50 dark:hover:bg-gray-700"><ArrowLeft size={18} /></button>
       <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase leading-none">{title}</h1>
    </div>
  );

  const Toggle = ({ active, onToggle, label }: { active: boolean; onToggle: () => void; label: string }) => (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700/50 mb-1.5 hover:border-blue-100 dark:hover:border-blue-900/30 transition-colors cursor-pointer" onClick={onToggle}>
      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight">{label}</span>
      <button className={`transition-all pointer-events-none transform scale-90 ${active ? 'text-blue-600' : 'text-gray-300'}`}>
        {active ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
      </button>
    </div>
  );

  const renderSubViewContent = () => {
    switch (activeSubView) {
      case 'appearance':
        return (
          <div className="animate-in slide-in-from-right duration-300 max-w-lg mx-auto">
            {renderHeader(t('interfaceStyling'))}
            <section className="space-y-3 px-1">
               <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('theme')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {id: 'light', icon: Sun}, {id: 'dark', icon: Moon}, {id: 'auto', icon: Monitor}
                    ].map(item => (
                      <button key={item.id} onClick={() => updateSettings({ theme: item.id as any })} className={`py-3 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${settings.theme === item.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 dark:bg-gray-900 text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'}`}><item.icon size={16}/><span className="text-[10px] font-black uppercase tracking-widest">{item.id}</span></button>
                    ))}
                  </div>
               </div>
               <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('fontSize')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['small', 'medium', 'large'].map(size => (
                      <button key={size} onClick={() => updateSettings({ fontSize: size as any })} className={`py-3 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${settings.fontSize === size ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-gray-50 dark:bg-gray-900 text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'}`}><Type size={size === 'small' ? 14 : size === 'medium' ? 16 : 18} /><span className="text-[10px] font-black uppercase tracking-widest">{size}</span></button>
                    ))}
                  </div>
               </div>
            </section>
          </div>
        );
      case 'dashboard':
        return (
          <div className="animate-in slide-in-from-right duration-300 max-w-lg mx-auto pb-10">
            {renderHeader(t('displayLayout'))}
            <section className="space-y-0.5">
                <Toggle label={t('mainBudgetForecast')} active={settings.showBudgetOnDashboard} onToggle={() => updateSettings({ showBudgetOnDashboard: !settings.showBudgetOnDashboard })} />
                <Toggle label={t('categoryBudgetProgress')} active={settings.showCategoryBudgetsOnDashboard} onToggle={() => updateSettings({ showCategoryBudgetsOnDashboard: !settings.showCategoryBudgetsOnDashboard })} />
                <Toggle label={t('financialOverviewChart')} active={settings.showFinancialOverviewChart} onToggle={() => updateSettings({ showFinancialOverviewChart: !settings.showFinancialOverviewChart })} />
                <Toggle label={t('accountsRow')} active={settings.showAccountsOnDashboard} onToggle={() => updateSettings({ showAccountsOnDashboard: !settings.showAccountsOnDashboard })} />
                <Toggle label={t('quickActionBar')} active={settings.showQuickActionsOnDashboard} onToggle={() => updateSettings({ showQuickActionsOnDashboard: !settings.showQuickActionsOnDashboard })} />
                <Toggle label={t('budgetHealth')} active={settings.showFinancialHealthScore} onToggle={() => updateSettings({ showFinancialHealthScore: !settings.showFinancialHealthScore })} />
            </section>
          </div>
        );
      case 'regional':
        return (
          <div className="animate-in slide-in-from-right duration-300 max-w-lg mx-auto pb-10">
            {renderHeader(t('languageCurrency'))}
            <section className="space-y-3 px-1">
               <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-1.5">
                   <div className="flex items-center gap-2">
                      <Globe size={14} className="text-blue-500" />
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">{t('selectedLanguage')}</label>
                   </div>
                   <select value={settings.language} onChange={e => updateSettings({ language: e.target.value })} className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg text-xs font-bold dark:text-white outline-none appearance-none">
                      {availableLanguages.map(l => <option key={l} value={l}>{LANGUAGE_NAMES[l] || l}</option>)}
                   </select>
               </div>
               <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-1.5">
                   <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-blue-500" />
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">{t('mainCurrency')}</label>
                   </div>
                   <select value={settings.currency} onChange={e => updateSettings({ currency: e.target.value })} className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg text-xs font-bold dark:text-white outline-none appearance-none">
                      {settings.currencies.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
               </div>
            </section>
          </div>
        );
      case 'accounts':
        return (
          <div className="animate-in slide-in-from-right duration-300 max-w-lg mx-auto pb-10">
            {renderHeader(t('manageAccounts'))}
            <section className="space-y-2 px-1">
                {accounts.map(acc => (
                  <div key={acc.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all">
                     {editingAccountId === acc.id ? (
                       <div className="flex gap-2"><input value={editAccountName} onChange={e => setEditAccountName(e.target.value)} className="flex-1 p-2 text-xs font-bold bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg dark:text-white outline-none" autoFocus /><button onClick={() => { if(editAccountName) { updateAccountName(acc.id, editAccountName); setEditingAccountId(null); } }} className="p-2 bg-blue-600 text-white rounded-lg shadow-sm"><Check size={16}/></button></div>
                     ) : (
                       <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg flex items-center justify-center shadow-sm">{acc.key === 'bank' ? <CreditCard size={16}/> : <Banknote size={16}/>}</div><div><p className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase leading-none mb-1">{t(acc.name)}</p><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">{formatPrice(getAccountBalance(acc.id))}</p></div></div><div className="flex gap-1"><button onClick={() => { setEditingAccountId(acc.id); setEditAccountName(acc.name); }} className="p-2 text-gray-400 hover:text-blue-600 transition-all active:scale-90"><Edit2 size={16}/></button><button onClick={() => deleteAccount(acc.id)} className="p-2 text-red-400 hover:text-red-600 transition-all active:scale-90"><Trash2 size={16}/></button></div></div>
                     )}
                  </div>
                ))}
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mt-2 space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">New Account</p>
                  <div className="flex gap-2"><input value={newAccountName} onChange={e => setNewAccountName(e.target.value)} placeholder="e.g. My Savings" className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-500/20 rounded-lg text-xs font-bold outline-none dark:text-white shadow-inner" /><button onClick={() => { if(newAccountName) { addAccount({key: 'bank', name: newAccountName}); setNewAccountName(''); } }} className="p-2.5 bg-blue-600 text-white rounded-lg shadow-sm active:scale-90"><Plus size={18}/></button></div>
                </div>
            </section>
          </div>
        );
      case 'categories':
        const filteredCategories = categories.filter(c => c.type === categoryType);
        return (
          <div className="animate-in slide-in-from-right duration-300 max-w-lg mx-auto pb-10">
            {renderHeader(t('categoriesLabels'))}
            <section className="space-y-3 px-1">
               <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg shadow-inner">
                 <button onClick={() => setCategoryType('expense')} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${categoryType === 'expense' ? 'bg-white dark:bg-gray-800 text-red-500 shadow-sm' : 'text-gray-400'}`}>{t('expense')}</button>
                 <button onClick={() => setCategoryType('income')} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${categoryType === 'income' ? 'bg-white dark:bg-gray-800 text-green-500 shadow-sm' : 'text-gray-400'}`}>{t('income')}</button>
               </div>
               <div className="space-y-1.5">
                 {filteredCategories.map(cat => (
                   <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                     <div className="p-3 flex items-center justify-between">
                       {editingCategoryId === cat.id ? (
                          <div className="flex-1 flex gap-2"><input value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} className="flex-1 p-2 text-xs font-bold bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white outline-none" autoFocus /><button onClick={() => { updateCategory({...cat, name: editCategoryName}); setEditingCategoryId(null); }} className="p-2 bg-blue-600 text-white rounded-lg shadow-sm"><Check size={16}/></button></div>
                       ) : (
                         <>
                           <div className="flex-1 cursor-pointer group" onClick={() => setExpandingCategoryId(expandingCategoryId === cat.id ? null : cat.id)}>
                              <p className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase leading-none group-hover:text-blue-600 transition-colors">{t(cat.name)}</p>
                              <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-gray-400 font-bold uppercase leading-none">{cat.subCategories?.length || 0} Sub-cats</span><ChevronDown size={12} className={`text-gray-400 transition-transform ${expandingCategoryId === cat.id ? 'rotate-180' : ''}`} /></div>
                           </div>
                           <div className="flex gap-1"><button onClick={() => { setEditingCategoryId(cat.id); setEditCategoryName(cat.name); }} className="p-2 text-gray-400 hover:text-blue-600 active:scale-90"><Edit2 size={14}/></button><button onClick={() => deleteCategory(cat.id)} className="p-2 text-red-400 hover:text-red-600 active:scale-90"><Trash2 size={14}/></button></div>
                         </>
                       )}
                     </div>
                     {expandingCategoryId === cat.id && (
                       <div className="bg-gray-50 dark:bg-gray-900/50 p-3 border-t border-gray-50 dark:border-gray-800 animate-in slide-in-from-top duration-300">
                          <div className="flex flex-wrap gap-2 mb-2">
                             {(cat.subCategories || []).map((sub, idx) => (
                               <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-md shadow-sm animate-in zoom-in"><span className="text-[9px] font-black text-gray-600 dark:text-gray-300 uppercase">{t(sub)}</span><button onClick={() => { const next = cat.subCategories.filter((_, i) => i !== idx); updateCategory({ ...cat, subCategories: next }); }} className="text-gray-400 hover:text-red-500"><X size={10} /></button></div>
                             ))}
                          </div>
                          <div className="flex gap-2"><input value={newSubCategory} onChange={e => setNewSubCategory(e.target.value)} placeholder={t('addLabel')} className="flex-1 p-2 text-[10px] font-bold bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg outline-none" /><button onClick={() => { if(newSubCategory) { updateCategory({...cat, subCategories: [...(cat.subCategories || []), newSubCategory]}); setNewSubCategory(''); } }} className="px-3 bg-gray-800 dark:bg-blue-600 text-white rounded-lg active:scale-90 transition-all"><Plus size={14}/></button></div>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
               <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mt-2"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">New Category</p><div className="flex gap-2"><input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="e.g. Health & Fitness" className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-500/20 rounded-lg text-xs font-bold outline-none dark:text-white transition-all shadow-inner" /><button onClick={() => { if(newCategoryName) { addCategory({name: newCategoryName, type: categoryType, subCategories: []}); setNewCategoryName(''); } }} className="p-2.5 bg-blue-600 text-white rounded-lg shadow-md active:scale-90"><Plus size={18}/></button></div></div>
            </section>
          </div>
        );
      case 'budgets':
        return (
          <div className="animate-in slide-in-from-right duration-300 max-w-lg mx-auto pb-10">
            {renderHeader(t('setBudget'))}
            <section className="space-y-3 px-1">
               {/* Global Budget */}
               <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                     <Target size={16} className="text-amber-500" />
                     <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">{t('globalMonthlyBudget')}</h3>
                  </div>
                  <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">{settings.currency}</span>
                     <input 
                        type="number" 
                        value={budget || ''} 
                        onChange={(e) => updateBudget(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg text-lg font-black dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                     />
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold ml-1">Overall spending limit for the month.</p>
               </div>

               {/* Category Budgets */}
               <div className="space-y-1.5">
                  <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none ml-2 pt-2">{t('categorySpecificLimits')}</h3>
                  {categories.filter(c => c.type === 'expense').map(cat => {
                     const catBudget = categoryBudgets.find(b => b.categoryId === cat.id)?.amount || 0;
                     return (
                        <div key={cat.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                           <div className="flex-1">
                              <p className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase leading-none mb-1">{t(cat.name)}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Limit</p>
                           </div>
                           <div className="relative w-28">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-black">{settings.currency}</span>
                              <input 
                                 type="number" 
                                 value={catBudget || ''} 
                                 onChange={(e) => updateCategoryBudget(cat.id, parseFloat(e.target.value) || 0)}
                                 placeholder="0"
                                 className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg text-sm font-black dark:text-white outline-none focus:border-amber-500 text-right"
                              />
                           </div>
                        </div>
                     );
                  })}
               </div>
            </section>
          </div>
        );
      default:
        return (
          <div className="space-y-3 max-w-lg mx-auto pb-10">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-none pt-2 px-2">{t('appPrefs')}</h1>
            <div className="grid grid-cols-1 gap-2.5 px-1">
               {[
                 { id: 'regional', label: t('languageCurrency'), icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                 { id: 'appearance', label: t('interfaceStyling'), icon: Palette, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                 { id: 'categories', label: t('categoriesLabels'), icon: Tags, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                 { id: 'accounts', label: t('bankAccounts'), icon: Banknote, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                 { id: 'dashboard', label: t('displayLayout'), icon: LayoutDashboard, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                 { id: 'budgets', label: t('setBudget'), icon: Target, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
               ].map((item) => (
                 <button key={item.id} onClick={() => navigateTo(item.id)} className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50 active:scale-[0.98] transition-all group shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3 text-left">
                        <div className={`p-2.5 ${item.bg} ${item.color} rounded-lg group-hover:scale-105 transition-transform`}>
                            <item.icon size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight leading-none">{item.label}</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:translate-x-1 transition-transform" />
                 </button>
               ))}
            </div>
            
            <div className="pt-3 px-3 space-y-2.5">
              <button onClick={() => { if(window.confirm("Reset settings to default?")) resetSettings(); }} className="w-full py-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-800 active:scale-95 transition-all">
                <RefreshCcw size={14}/> {t('resetSettings')}
              </button>

              <button onClick={() => { if(window.confirm("Clear all data from this device?")) resetPreferences(); }} className="w-full py-3.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/30 active:scale-95 transition-all shadow-sm">
                <RotateCcw size={14}/> {t('factoryReset')}
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-3 space-y-3 pb-24 min-h-full overflow-x-hidden">
      {renderSubViewContent()}
    </div>
  );
};

export default Settings;