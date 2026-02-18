
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage';
import { cloudDrive } from '../services/cloudDrive';
import { supabase } from '../services/supabaseClient';
import { 
  Transaction, Account, Category, AppSettings, 
  CategoryBudget, Notification, UserProfile, SyncState
} from '../types';
import { 
  INITIAL_ACCOUNTS, INITIAL_CATEGORIES, DEFAULT_SETTINGS, STORAGE_KEYS, 
  TRANSLATIONS 
} from '../constants';

interface AppContextProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  budget: number;
  categoryBudgets: CategoryBudget[];
  settings: AppSettings;
  notification: Notification | null;
  isActionSheetOpen: boolean;
  syncState: SyncState;
  
  setIsActionSheetOpen: (v: boolean) => void;
  
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => Promise<boolean>;
  importTransactions: (data: { transactions: Transaction[], updatedCategories: Category[] }) => void;
  
  addAccount: (a: Omit<Account, 'id'>) => void;
  updateAccountName: (id: string, name: string) => void;
  deleteAccount: (id: string) => Promise<void>;
  getAccountBalance: (id: string) => number;
  
  addCategory: (c: Category | Omit<Category, 'id'>) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => Promise<void>;
  
  updateBudget: (amount: number) => void;
  updateCategoryBudget: (catId: string, amount: number) => void;
  
  updateSettings: (s: Partial<AppSettings>) => void;
  resetPreferences: () => void;
  resetSettings: () => void;
  
  // Auth & Cloud
  login: (e: string, p: string) => Promise<void>;
  signup: (e: string, p: string, n: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (e: string) => Promise<void>;
  updatePassword: (p: string) => Promise<void>;
  backupUserData: () => Promise<void>;
  restoreBackup: (mode: 'replace' | 'merge') => Promise<boolean>;
  updateUserProfilePhoto: (url: string) => void;
  
  t: (key: string) => string;
  formatPrice: (amount: number) => string;
  availableLanguages: string[];
  availableCurrencies: string[];
  
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => storage.get(STORAGE_KEYS.TRANSACTIONS, []));
  const [accounts, setAccounts] = useState<Account[]>(() => storage.get(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS));
  const [categories, setCategories] = useState<Category[]>(() => storage.get(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES));
  const [settings, setSettings] = useState<AppSettings>(() => storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS));
  const [budget, setBudgetState] = useState<number>(() => storage.get(STORAGE_KEYS.BUDGET, 0));
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>(() => storage.get(STORAGE_KEYS.CATEGORY_BUDGETS, []));
  
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  const [syncState, setSyncState] = useState<SyncState>({
    isLoggedIn: false,
    user: null,
    lastSync: null,
    isPasswordRecovery: false
  });

  // Persistence Effects
  useEffect(() => { storage.set(STORAGE_KEYS.TRANSACTIONS, transactions); }, [transactions]);
  useEffect(() => { storage.set(STORAGE_KEYS.ACCOUNTS, accounts); }, [accounts]);
  useEffect(() => { storage.set(STORAGE_KEYS.CATEGORIES, categories); }, [categories]);
  useEffect(() => { storage.set(STORAGE_KEYS.SETTINGS, settings); }, [settings]);
  useEffect(() => { storage.set(STORAGE_KEYS.BUDGET, budget); }, [budget]);
  useEffect(() => { storage.set(STORAGE_KEYS.CATEGORY_BUDGETS, categoryBudgets); }, [categoryBudgets]);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) handleUserSession(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            handleUserSession(session.user);
        } else {
            setSyncState(prev => ({ ...prev, isLoggedIn: false, user: null }));
        }

        if (event === 'PASSWORD_RECOVERY') {
            setSyncState(prev => ({ ...prev, isPasswordRecovery: true }));
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserSession = async (user: any) => {
    try {
        const profile = await cloudDrive.ensureUserProfile(user);
        setSyncState(prev => ({ ...prev, isLoggedIn: true, user: profile }));
    } catch (error) {
        console.error("Auth session error", error);
    }
  };

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setNotification({ id: Date.now(), message, type });
      setTimeout(() => setNotification(null), 3000);
  }, []);

  // --- Transaction Logic ---
  const addTransaction = useCallback((tData: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [{ ...tData, id: crypto.randomUUID() }, ...prev]);
  }, []);

  const updateTransaction = useCallback((data: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === data.id ? data : t));
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    return true;
  }, []);

  const importTransactions = useCallback((data: { transactions: Transaction[], updatedCategories: Category[] }) => {
      setCategories(data.updatedCategories);
      setTransactions(prev => [...prev, ...data.transactions]);
      showNotification(`${data.transactions.length} items imported! Categories updated.`);
  }, [showNotification]);

  // --- Account Logic ---
  const addAccount = useCallback((a: Omit<Account, 'id'>) => {
    setAccounts(prev => [...prev, { ...a, id: `acc_${Date.now()}` }]);
  }, []);

  const updateAccountName = useCallback((id: string, name: string) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, name } : a));
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, []);

  const getAccountBalance = useCallback((id: string) => {
    return transactions.reduce((acc, t) => {
      if (t.accountId === id) {
        if (t.type === 'income') return acc + t.amount;
        if (t.type === 'expense') return acc - t.amount;
      }
      if (t.fromAccountId === id) return acc - t.amount;
      if (t.toAccountId === id) return acc + t.amount;
      return acc;
    }, 0);
  }, [transactions]);

  // --- Category Logic ---
  const addCategory = useCallback((c: Category | Omit<Category, 'id'>) => {
    const id = 'id' in c ? c.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat_${Date.now()}`);
    setCategories(prev => {
      if (prev.some(cat => cat.name.toLowerCase() === c.name.toLowerCase() && cat.type === c.type)) {
        return prev; 
      }
      return [...prev, { ...c, id, subCategories: c.subCategories || [] } as Category];
    });
  }, []);

  const updateCategory = useCallback((c: Category) => {
    setCategories(prev => prev.map(cat => cat.id === c.id ? c : cat));
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setTransactions(prev => prev.map(t => {
        if (t.categoryId === id) {
            return { ...t, categoryId: undefined, subCategory: undefined, note: t.note ? `${t.note} (Uncategorized)` : '(Uncategorized)' };
        }
        return t;
    }));
    setCategoryBudgets(prev => prev.filter(b => b.categoryId !== id));
  }, []);

  // --- Budget Logic ---
  const updateBudget = useCallback((amount: number) => {
    setBudgetState(amount);
  }, []);

  const updateCategoryBudget = useCallback((catId: string, amount: number) => {
    setCategoryBudgets(prev => {
      const existing = prev.find(b => b.categoryId === catId);
      if (existing) return prev.map(b => b.categoryId === catId ? { ...b, amount } : b);
      return [...prev, { categoryId: catId, amount }];
    });
  }, []);

  // --- Settings & Utils ---
  const updateSettings = useCallback((s: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...s }));
  }, []);

  const resetPreferences = useCallback(() => {
     storage.clearAll();
     window.location.reload();
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const t = useCallback((key: string): string => {
    const lang = settings.language;
    const dict = TRANSLATIONS[lang] || TRANSLATIONS['en'];
    return dict[key] || TRANSLATIONS['en'][key] || key;
  }, [settings.language]);

  const formatPrice = useCallback((amount: number) => {
    return new Intl.NumberFormat(settings.language === 'ne' ? 'en-IN' : settings.language, {
      style: 'currency',
      currency: settings.currency,
    }).format(amount);
  }, [settings.language, settings.currency]);

  // --- Auth & Cloud Methods ---
  const login = useCallback(async (email: string, pass: string) => {
    const profile = await cloudDrive.login(email, pass);
    setSyncState(prev => ({ ...prev, isLoggedIn: true, user: profile }));
  }, []);

  const signup = useCallback(async (email: string, pass: string, name: string) => {
    await cloudDrive.signup(email, pass, name);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSyncState({ isLoggedIn: false, user: null, lastSync: null, isPasswordRecovery: false });
    showNotification("Logged out successfully");
  }, [showNotification]);

  const resetPassword = useCallback(async (email: string) => {
    await cloudDrive.resetPassword(email);
  }, []);

  const updatePassword = useCallback(async (pass: string) => {
    await cloudDrive.updatePassword(pass);
  }, []);

  const backupUserData = useCallback(async () => {
    if (!syncState.user) return;
    const appData = { transactions, accounts, categories, settings, budget, categoryBudgets };
    const { timestamp } = await cloudDrive.backupUserData(syncState.user.id, appData);
    setSyncState(prev => ({ ...prev, lastSync: timestamp }));
  }, [syncState.user, transactions, accounts, categories, settings, budget, categoryBudgets]);

  const restoreBackup = useCallback(async (mode: 'replace' | 'merge') => {
    if (!syncState.user) return false;
    const backup = await cloudDrive.restoreBackup(syncState.user.id);
    if (!backup || !backup.data) return false;
    
    const d = backup.data;
    if (d.transactions) setTransactions(d.transactions);
    if (d.accounts) setAccounts(d.accounts);
    if (d.categories) setCategories(d.categories);
    if (d.settings) setSettings(d.settings);
    if (d.budget) setBudgetState(d.budget);
    if (d.categoryBudgets) setCategoryBudgets(d.categoryBudgets);
    
    setSyncState(prev => ({ ...prev, lastSync: backup.metadata.timestamp }));
    return true;
  }, [syncState.user]);

  const updateUserProfilePhoto = useCallback((url: string) => {
    setSyncState(prev => prev.user ? { ...prev, user: { ...prev.user, photoURL: url } } : prev);
  }, []);

  const availableLanguages = Object.keys(TRANSLATIONS);
  const availableCurrencies = settings.currencies;

  return (
    <AppContext.Provider value={{
      transactions, accounts, categories, budget, categoryBudgets, settings, notification, isActionSheetOpen, syncState,
      setIsActionSheetOpen,
      addTransaction, updateTransaction, deleteTransaction, importTransactions,
      addAccount, updateAccountName, deleteAccount, getAccountBalance,
      addCategory, updateCategory, deleteCategory,
      updateBudget, updateCategoryBudget, updateSettings, resetPreferences, resetSettings,
      login, signup, logout, resetPassword, updatePassword, backupUserData, restoreBackup, updateUserProfilePhoto,
      t, formatPrice, availableLanguages, availableCurrencies, showNotification
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
