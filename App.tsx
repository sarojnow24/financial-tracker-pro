
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import TransactionModal from './components/TransactionModal';
import { Transaction, TransactionType } from './types';

const AppContent = () => {
  const { settings } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [modalType, setModalType] = useState<TransactionType>('expense');

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = settings.theme === 'dark' || 
                  (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    
    const scaleMap: Record<string, string> = { small: '0.85', medium: '1.0', large: '1.15' };
    (root.style as any).zoom = scaleMap[settings.fontSize] || '1.0';

    if (settings.language === 'ar') root.setAttribute('dir', 'rtl');
    else root.setAttribute('dir', 'ltr');
  }, [settings.theme, settings.fontSize, settings.language]);

  const handleOpenAdd = (type: TransactionType = 'expense') => {
    setEditingTransaction(null);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setModalType(tx.type);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingTransaction(null);
      setModalType('expense');
    }, 300);
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout onOpenAddModal={() => handleOpenAdd('expense')} />}>
          <Route index element={<Dashboard onEditTransaction={handleEdit} onQuickAction={handleOpenAdd} />} />
          <Route path="reports" element={<Reports onEditTransaction={handleEdit} />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      
      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={handleClose} 
        editTransaction={editingTransaction}
        initialType={modalType}
      />
    </HashRouter>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
