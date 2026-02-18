
export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountKey = 'cash' | 'bank' | 'wallet';

export interface Account {
  id: string;
  key: AccountKey;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  subCategories: string[];
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  note: string;
  accountId?: string;
  categoryId?: string;
  subCategory?: string;
  fromAccountId?: string;
  toAccountId?: string;
  isFlagged?: boolean; 
}

export interface AppSettings {
  currency: string;
  currencies: string[];
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  language: string;
  defaultDashboardView: 'today' | 'week' | 'month';
  showBudgetOnDashboard: boolean;
  showCategoryBudgetsOnDashboard: boolean;
  showFinancialOverviewChart: boolean;
  showAccountsOnDashboard: boolean;
  showQuickActionsOnDashboard: boolean;
  showFinancialHealthScore: boolean;
  autoBackup: 'off' | 'daily' | 'weekly';
  reportChartType: 'bar' | 'pie' | 'line';
}

export interface CategoryBudget {
  categoryId: string;
  amount: number;
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  address?: string;
  photoURL?: string | null;
  createdAt?: string;
  emailVerified?: boolean;
}

export interface SyncState {
  isLoggedIn: boolean;
  user: UserProfile | null;
  lastSync: string | null;
  isPasswordRecovery: boolean;
  backupSize?: string;
}

export interface Wallet {
  id: string;
  name: string;
  currency: string;
  created_by: string;
  role?: string;
  is_shared?: boolean;
  created_at?: string;
}

export interface WalletMember {
  wallet_id: string;
  user_id: string;
  role: string;
  full_name?: string;
  email?: string;
  photo_url?: string | null;
}
