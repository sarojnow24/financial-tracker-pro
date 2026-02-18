
import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Calendar, Tag, FileText, ChevronDown } from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { useApp } from '../context/AppContext';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTransaction?: Transaction | null;
  initialType?: TransactionType;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, editTransaction, initialType }) => {
  const { accounts, categories, addTransaction, updateTransaction, settings, t, addCategory, updateCategory } = useApp();
  
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  
  const getLocalDateStr = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getLocalDateStr());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [accountId, setAccountId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategory, setSubCategory] = useState('');

  // Inline Creation States
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingSub, setIsCreatingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');

  const availableSubCategories = React.useMemo(() => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.subCategories || [];
  }, [categoryId, categories]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsCreatingCategory(false);
      setIsCreatingSub(false);
      setNewCategoryName('');
      setNewSubName('');

      if (editTransaction) {
        setType(editTransaction.type);
        setAmount(editTransaction.amount.toString());
        setDate(getLocalDateStr(new Date(editTransaction.date)));
        setNote(editTransaction.note);
        setAccountId(editTransaction.accountId || '');
        setFromAccountId(editTransaction.fromAccountId || '');
        setToAccountId(editTransaction.toAccountId || '');
        setCategoryId(editTransaction.categoryId || '');
        setSubCategory(editTransaction.subCategory || '');
      } else {
        setType(initialType || 'expense');
        setAmount('');
        setDate(getLocalDateStr());
        setNote('');
        const defaultAcc = accounts[0]?.id || '';
        setAccountId(defaultAcc);
        setFromAccountId(defaultAcc);
        setToAccountId(accounts[1]?.id || accounts[0]?.id || '');
        setCategoryId('');
        setSubCategory('');
      }
    }
  }, [isOpen, editTransaction, initialType, accounts]);

  // --- HANDLERS ---

  const handleCategorySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__NEW__') {
      setIsCreatingCategory(true);
      setCategoryId('');
      setSubCategory('');
      setNewCategoryName('');
      setTimeout(() => document.getElementById('new-cat-input')?.focus(), 50);
    } else {
      setCategoryId(val);
      setSubCategory('');
    }
  };

  const handleSubCategorySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__NEW__') {
      setIsCreatingSub(true);
      setSubCategory('');
      setNewSubName('');
      setTimeout(() => document.getElementById('new-sub-input')?.focus(), 50);
    } else {
      setSubCategory(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Basic Validation
    if (!amount || parseFloat(amount) <= 0) {
      setError("Enter valid amount.");
      return;
    }

    if (type !== 'transfer') {
        if (!isCreatingCategory && !categoryId) {
            setError("Please select a category.");
            return;
        }
        if (isCreatingCategory && !newCategoryName.trim()) {
            setError("Category name cannot be empty.");
            return;
        }
    }

    // 2. Prepare Data
    const [y, m, d] = date.split('-').map(Number);
    const finalIsoDate = new Date(y, m - 1, d).toISOString();

    const txData: any = { type, amount: parseFloat(amount), date: finalIsoDate, note };

    if (type === 'transfer') {
        txData.fromAccountId = fromAccountId;
        txData.toAccountId = toAccountId;
    } else {
        txData.accountId = accountId;
        
        // --- Category Logic ---
        let finalCatId = categoryId;
        const trimmedCatName = newCategoryName.trim();
        const trimmedSubName = newSubName.trim();
        let wasCreatedFresh = false;

        if (isCreatingCategory) {
            // Check if it already exists (case-insensitive) to avoid duplicates
            const existingCat = categories.find(c => c.name.toLowerCase() === trimmedCatName.toLowerCase() && c.type === type);
            if (existingCat) {
                finalCatId = existingCat.id;
            } else {
                finalCatId = `cat_${Date.now()}`;
                wasCreatedFresh = true;
                
                // If we are creating a fresh category, add the subcategory immediately if provided
                const initialSubs = (isCreatingSub && trimmedSubName) ? [trimmedSubName] : [];
                
                // This persists to localStorage via AppContext
                addCategory({
                    id: finalCatId,
                    name: trimmedCatName,
                    type,
                    subCategories: initialSubs
                });
            }
        }

        txData.categoryId = finalCatId;

        // --- Sub-Category Logic ---
        let finalSubVal = subCategory;

        if (isCreatingSub) {
            if (trimmedSubName) {
                finalSubVal = trimmedSubName;
                
                // If we didn't just create the category, we might need to update an existing one
                if (!wasCreatedFresh) {
                    const cat = categories.find(c => c.id === finalCatId);
                    if (cat) {
                        const subExists = (cat.subCategories || []).some(s => s.toLowerCase() === trimmedSubName.toLowerCase());
                        if (!subExists) {
                            // This persists to localStorage via AppContext
                            updateCategory({
                                ...cat,
                                subCategories: [...(cat.subCategories || []), trimmedSubName]
                            });
                        }
                    }
                }
            } else {
                // User clicked create but left it empty -> default to empty
                finalSubVal = '';
            }
        }

        txData.subCategory = finalSubVal;
    }
    
    // Save Transaction (persists to localStorage via AppContext)
    if (editTransaction) updateTransaction({ ...txData, id: editTransaction.id });
    else addTransaction(txData);
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300">
        
        <div className="flex justify-between items-center px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-sm font-black text-gray-800 dark:text-gray-100 tracking-widest uppercase">
            {editTransaction ? t('editEntry') : t('newEntry')}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto no-scrollbar">
          
          <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-xl gap-1 border border-gray-100 dark:border-gray-700">
             {['expense', 'income', 'transfer'].map(tType => (
               <button key={tType} type="button" onClick={() => { setType(tType as any); setCategoryId(''); setSubCategory(''); setIsCreatingCategory(false); setIsCreatingSub(false); }} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${type === tType ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm border border-gray-100 dark:border-gray-700' : 'text-gray-400'}`}>
                 {t(tType)}
               </button>
             ))}
          </div>

          <div className="grid grid-cols-[1fr,auto] gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('amount')} ({settings.currency})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">{settings.currency}</span>
                <input 
                  type="number" 
                  inputMode="decimal"
                  step="0.01" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  className="w-full pl-14 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-lg font-black dark:text-white outline-none focus:ring-1 focus:ring-blue-500/30" 
                  placeholder="0.00" 
                  autoFocus 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('date')}</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[11px] font-bold dark:text-white outline-none w-[130px]" 
                />
              </div>
            </div>
          </div>

          {type !== 'transfer' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('category')}</label>
                {isCreatingCategory ? (
                   <div className="relative animate-in fade-in zoom-in duration-200">
                      <input 
                        id="new-cat-input"
                        value={newCategoryName} 
                        onChange={e => setNewCategoryName(e.target.value)}
                        placeholder={t('createCategory')}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-blue-500 rounded-xl text-[11px] font-bold dark:text-white outline-none shadow-sm pr-8"
                      />
                      <button type="button" onClick={() => { setIsCreatingCategory(false); setCategoryId(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={14}/></button>
                   </div>
                ) : (
                  <div className="relative">
                    <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select 
                      value={categoryId} 
                      onChange={handleCategorySelectChange}
                      className="w-full pl-8 pr-2 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[11px] font-bold dark:text-white outline-none appearance-none transition-colors focus:border-blue-500/30"
                    >
                      <option value="">{t('select')}</option>
                      {categories.filter(c => c.type === type).map(cat => (
                        <option key={cat.id} value={cat.id}>{t(cat.name)}</option>
                      ))}
                      <option disabled>──────────</option>
                      <option value="__NEW__" className="text-blue-600 font-bold">+ {t('createCategory')}</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('subCategory')}</label>
                {isCreatingSub ? (
                   <div className="relative animate-in fade-in zoom-in duration-200">
                      <input 
                        id="new-sub-input"
                        value={newSubName} 
                        onChange={e => setNewSubName(e.target.value)}
                        placeholder={t('subCategory')}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-blue-500 rounded-xl text-[11px] font-bold dark:text-white outline-none shadow-sm pr-8"
                      />
                      <button type="button" onClick={() => { setIsCreatingSub(false); setSubCategory(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={14}/></button>
                   </div>
                ) : (
                  <div className="relative">
                    <select 
                      value={subCategory} 
                      onChange={handleSubCategorySelectChange}
                      disabled={!categoryId && !isCreatingCategory}
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[11px] font-bold dark:text-white outline-none appearance-none disabled:opacity-40 transition-colors focus:border-blue-500/30"
                    >
                      <option value="">{t('all')}</option>
                      {availableSubCategories.map(sub => <option key={sub} value={sub}>{t(sub)}</option>)}
                      <option disabled>──────────</option>
                      <option value="__NEW__" className="text-blue-600 font-bold">+ {t('subCategory')}</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none opacity-50"/>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('from')}</label>
                <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[11px] font-bold dark:text-white outline-none appearance-none">
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{t(acc.name)}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('to')}</label>
                <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[11px] font-bold dark:text-white outline-none appearance-none">
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{t(acc.name)}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('note')}</label>
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input 
                type="text" 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[11px] font-bold dark:text-white outline-none focus:ring-1 focus:ring-blue-500/30" 
                placeholder="..." 
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-[9px] text-red-500 font-bold uppercase tracking-wide py-1 animate-in slide-in-from-top-1">
              <AlertCircle size={12} /> {error}
            </div>
          )}

          <button 
            type="submit" 
            className="w-full py-3.5 bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Check size={16} strokeWidth={3} /> {t('saveRecord')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
