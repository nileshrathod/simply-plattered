import { useCallback, useEffect, useState } from 'react';
import {
  BusinessSettings,
  CustomEnquiryStatus,
  CustomOrderEnquiry,
  DemoStoreState,
  OrderStatus,
  PaymentMethod,
  PlatterProduct,
} from './types/simplyPlattered';
import {
  addDemoOrderPayment,
  addDemoProduct,
  createCustomEnquiry,
  createDemoOrder,
  CreateDemoOrderInput,
  deleteCustomEnquiry,
  deleteDemoOrder,
  deleteDemoOrderPayment,
  deleteDemoProduct,
  DEMO_STORAGE_KEY,
  exportDemoDataJson,
  importDemoDataJson,
  loadDemoStore,
  resetDemoStore,
  seedSampleDemoOrders,
  toggleDemoProductAvailability,
  updateBusinessSettings,
  updateCustomEnquiry,
  updateDemoOrderAdminNotes,
  updateDemoOrderStatus,
  updateDemoProduct,
} from './lib/demoStorage';
import { ActiveRoute, Navbar, ThemeMode } from './components/Navbar';
import { StorefrontView } from './components/StorefrontView';
import { OrderFormView } from './components/OrderFormView';
import { AdminDashboardView } from './components/AdminDashboardView';

const THEME_STORAGE_KEY = 'simply_plattered_theme_v1';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Ignore storage access errors
  }
  return 'light';
}

export default function App() {
  const [store, setStore] = useState<DemoStoreState>(() => loadDemoStore());
  const [activeRoute, setActiveRoute] = useState<ActiveRoute>('storefront');
  const [bag, setBag] = useState<Record<string, number>>({});
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage access errors
    }
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Sync changes if demo store is modified in another browser tab
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === DEMO_STORAGE_KEY) {
        setStore(loadDemoStore());
      } else if (e.key === THEME_STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleNavigate = useCallback((route: ActiveRoute, anchorId?: string) => {
    setActiveRoute(route);
    if (anchorId) {
      window.setTimeout(() => {
        const el = document.getElementById(anchorId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleUpdateBagQuantity = useCallback((productId: string, delta: number) => {
    setBag((prev) => {
      const nextQty = Math.max(0, (prev[productId] || 0) + delta);
      if (nextQty === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: nextQty };
    });
  }, []);

  const handleClearBag = useCallback(() => {
    setBag({});
  }, []);

  const handleStartOrder = useCallback(
    (preselectProductId?: string) => {
      if (preselectProductId) {
        setBag((prev) => ({
          ...prev,
          [preselectProductId]: Math.max(1, prev[preselectProductId] || 0),
        }));
      }
      handleNavigate('order');
    },
    [handleNavigate]
  );

  const handleSubmitOrder = useCallback(
    (input: CreateDemoOrderInput) => {
      const { nextState, order } = createDemoOrder(store, input);
      setStore(nextState);
      return order;
    },
    [store]
  );

  const handleSubmitCustomEnquiry = useCallback(
    (
      input: Omit<
        CustomOrderEnquiry,
        'id' | 'reference' | 'createdAt' | 'status' | 'adminNotes'
      >
    ) => {
      const { nextState, enquiry } = createCustomEnquiry(store, input);
      setStore(nextState);
      return enquiry;
    },
    [store]
  );

  const handleExportJson = useCallback(() => {
    const { json, nextState } = exportDemoDataJson(store);
    setStore(nextState);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simply-plattered-demo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [store]);

  const handleImportJson = useCallback((jsonText: string) => {
    const result = importDemoDataJson(jsonText);
    if (result.ok && result.state) {
      setStore(result.state);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }, []);

  const bagItemCount = Object.entries(bag).reduce((sum, [id, qty]) => {
    const prod = store.products.find((p) => p.id === id);
    return prod && prod.available ? sum + qty : sum;
  }, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] dark:bg-[#111110] text-[#1C1917] dark:text-[#F5F4F0] transition-colors">
      <Navbar
        activeRoute={activeRoute}
        bagItemCount={bagItemCount}
        settings={store.businessSettings}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onNavigate={handleNavigate}
      />

      <div className="flex-1">
        {activeRoute === 'storefront' && (
          <StorefrontView
            products={store.products}
            orders={store.orders}
            settings={store.businessSettings}
            bag={bag}
            onUpdateBagQuantity={handleUpdateBagQuantity}
            onStartOrder={handleStartOrder}
            onOpenAdmin={() => handleNavigate('admin')}
            onSubmitCustomEnquiry={handleSubmitCustomEnquiry}
          />
        )}

        {activeRoute === 'order' && (
          <OrderFormView
            products={store.products}
            settings={store.businessSettings}
            bag={bag}
            onUpdateBagQuantity={handleUpdateBagQuantity}
            onClearBag={handleClearBag}
            onSubmitOrder={handleSubmitOrder}
            onBackToStorefront={() => handleNavigate('storefront', 'platters')}
            onOpenAdmin={() => handleNavigate('admin')}
          />
        )}

        {activeRoute === 'admin' && (
          <AdminDashboardView
            store={store}
            isAdminUnlocked={isAdminUnlocked}
            onUnlockAdmin={() => setIsAdminUnlocked(true)}
            onLockAdmin={() => setIsAdminUnlocked(false)}
            onUpdateOrderStatus={(orderId: string, status: OrderStatus) =>
              setStore((prev) => updateDemoOrderStatus(prev, orderId, status))
            }
            onUpdateOrderNotes={(orderId: string, notes: string) =>
              setStore((prev) => updateDemoOrderAdminNotes(prev, orderId, notes))
            }
            onAddPayment={(
              orderId: string,
              payment: {
                amount: number;
                method: PaymentMethod;
                reference: string;
                paidAt: string;
                notes: string;
              }
            ) => setStore((prev) => addDemoOrderPayment(prev, orderId, payment))}
            onDeletePayment={(orderId: string, paymentId: string) =>
              setStore((prev) => deleteDemoOrderPayment(prev, orderId, paymentId))
            }
            onDeleteOrder={(orderId: string) =>
              setStore((prev) => deleteDemoOrder(prev, orderId))
            }
            onToggleProductAvailability={(productId: string) =>
              setStore((prev) => toggleDemoProductAvailability(prev, productId))
            }
            onUpdateProduct={(
              productId: string,
              updates: Partial<Omit<PlatterProduct, 'id'>>
            ) => setStore((prev) => updateDemoProduct(prev, productId, updates))}
            onAddProduct={(
              input: Omit<PlatterProduct, 'id' | 'slug' | 'sortOrder' | 'updatedAt'>
            ) => setStore((prev) => addDemoProduct(prev, input))}
            onDeleteProduct={(productId: string) =>
              setStore((prev) => deleteDemoProduct(prev, productId))
            }
            onUpdateCustomEnquiry={(
              enquiryId: string,
              updates: { status?: CustomEnquiryStatus; adminNotes?: string }
            ) => setStore((prev) => updateCustomEnquiry(prev, enquiryId, updates))}
            onDeleteCustomEnquiry={(enquiryId: string) =>
              setStore((prev) => deleteCustomEnquiry(prev, enquiryId))
            }
            onSaveSettings={(updates: Partial<BusinessSettings>) =>
              setStore((prev) => updateBusinessSettings(prev, updates))
            }
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onSeedSampleOrders={() => setStore((prev) => seedSampleDemoOrders(prev))}
            onResetAllDemoData={() => {
              setStore(resetDemoStore());
              setBag({});
            }}
            onNavigateToOrderForm={() => handleNavigate('order')}
          />
        )}
      </div>
    </div>
  );
}
