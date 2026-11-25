import { useState } from 'react';
import { Menu, Moon, ShoppingBag, Sun, X } from 'lucide-react';
import { BusinessSettings } from '../types/simplyPlattered';

export type ActiveRoute = 'storefront' | 'order' | 'admin';
export type ThemeMode = 'light' | 'dark';

interface NavbarProps {
  activeRoute: ActiveRoute;
  bagItemCount: number;
  settings: BusinessSettings;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNavigate: (route: ActiveRoute, anchorId?: string) => void;
}

export function Navbar({
  activeRoute,
  bagItemCount,
  settings,
  theme,
  onToggleTheme,
  onNavigate,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (route: ActiveRoute, anchorId?: string) => {
    setMobileMenuOpen(false);
    onNavigate(route, anchorId);
  };

  return (
    <div className="w-full">
      {/* Prominent non-sticky Demo Mode notice bar */}
      <div
        role="status"
        className="w-full bg-[#1C1917] dark:bg-[#0A0A09] text-[#F5F4F0] border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="font-medium tracking-normal text-[#F5F4F0]">
            DEMO MODE: Data is stored locally in this browser. Orders are not sent to the business.
          </p>
          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="inline-flex items-center gap-1.5 text-[#D6D3CD] hover:text-white font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#E7C67E]" aria-hidden="true" />
                  <span>Light Theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#E7C67E]" aria-hidden="true" />
                  <span>Dark Theme</span>
                </>
              )}
            </button>
            <span className="text-white/25" aria-hidden="true">
              ·
            </span>
            {activeRoute !== 'admin' ? (
              <button
                type="button"
                onClick={() => handleNavClick('admin')}
                className="text-[#E7C67E] hover:text-white underline underline-offset-4 font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                Open Demo Admin
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleNavClick('storefront')}
                className="text-[#E7C67E] hover:text-white underline underline-offset-4 font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                Return to Storefront
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 w-full bg-[#FAFAF8]/95 dark:bg-[#111110]/95 backdrop-blur-sm border-b border-[#E5E2DC] dark:border-[#2D2B27] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <button
            type="button"
            onClick={() => handleNavClick('storefront')}
            className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#1C1917] dark:text-[#F5F4F0] hover:text-[#164E37] dark:hover:text-[#5ED09E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {settings.businessName}
          </button>

          {/* Zone 2: 4 clean single-line navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57534E] dark:text-[#A8A29E]"
          >
            <button
              type="button"
              onClick={() => handleNavClick('storefront', 'platters')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 cursor-pointer ${
                activeRoute === 'storefront'
                  ? 'text-[#1C1917] dark:text-[#F5F4F0] border-[#164E37] dark:border-[#5ED09E]'
                  : 'border-transparent hover:text-[#1C1917] dark:hover:text-[#F5F4F0] hover:border-[#D6D3CD] dark:hover:border-[#3A3732]'
              }`}
            >
              Platters
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('order')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 cursor-pointer ${
                activeRoute === 'order'
                  ? 'text-[#1C1917] dark:text-[#F5F4F0] border-[#164E37] dark:border-[#5ED09E]'
                  : 'border-transparent hover:text-[#1C1917] dark:hover:text-[#F5F4F0] hover:border-[#D6D3CD] dark:hover:border-[#3A3732]'
              }`}
            >
              Order Online
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('storefront', 'custom-orders')}
              className="whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 border-transparent hover:text-[#1C1917] dark:hover:text-[#F5F4F0] hover:border-[#D6D3CD] dark:hover:border-[#3A3732] cursor-pointer"
            >
              Custom Orders
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('admin')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 cursor-pointer ${
                activeRoute === 'admin'
                  ? 'text-[#1C1917] dark:text-[#F5F4F0] border-[#164E37] dark:border-[#5ED09E]'
                  : 'border-transparent hover:text-[#1C1917] dark:hover:text-[#F5F4F0] hover:border-[#D6D3CD] dark:hover:border-[#3A3732]'
              }`}
            >
              Demo Admin
            </button>
          </nav>

          {/* Zone 3: Theme toggle icon + primary action CTA + mobile menu toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E5E2DC] dark:border-[#2D2B27] bg-white dark:bg-[#1B1A18] text-[#1C1917] dark:text-[#F5F4F0] hover:bg-[#F2F1ED] dark:hover:bg-[#23221F] transition-colors shrink-0 cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#E7C67E]" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-[#57534E]" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('order')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">
                {bagItemCount > 0 ? `Order Bag (${bagItemCount})` : 'Demo Order'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E5E2DC] dark:border-[#2D2B27] text-[#1C1917] dark:text-[#F5F4F0] hover:bg-[#F2F1ED] dark:hover:bg-[#1B1A18] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5E2DC] dark:border-[#2D2B27] bg-[#FAFAF8] dark:bg-[#111110] px-4 py-3 space-y-1">
            <button
              type="button"
              onClick={() => handleNavClick('storefront', 'platters')}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#1C1917] dark:text-[#F5F4F0] hover:bg-[#F2F1ED] dark:hover:bg-[#1B1A18] rounded-lg cursor-pointer"
            >
              Platters
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('order')}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#1C1917] dark:text-[#F5F4F0] hover:bg-[#F2F1ED] dark:hover:bg-[#1B1A18] rounded-lg cursor-pointer"
            >
              Order Online
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('storefront', 'custom-orders')}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#1C1917] dark:text-[#F5F4F0] hover:bg-[#F2F1ED] dark:hover:bg-[#1B1A18] rounded-lg cursor-pointer"
            >
              Custom Orders
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('admin')}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#1C1917] dark:text-[#F5F4F0] hover:bg-[#F2F1ED] dark:hover:bg-[#1B1A18] rounded-lg cursor-pointer"
            >
              Demo Admin
            </button>
          </div>
        )}
      </header>
    </div>
  );
}
