import { ChangeEvent, FormEvent, useState } from 'react';
import { Check, Download, RotateCcw, Upload } from 'lucide-react';
import { BusinessSettings, DemoConfig } from '../../types/simplyPlattered';
import { getDemoStorageSizeBytes } from '../../lib/demoStorage';
import { formatDateTimeZA } from '../../lib/formatters';

interface AdminSettingsTabProps {
  settings: BusinessSettings;
  demoConfig: DemoConfig;
  orderCount: number;
  productCount: number;
  onSaveSettings: (updates: Partial<BusinessSettings>) => void;
  onExportJson: () => void;
  onImportJson: (jsonText: string) => { ok: boolean; error?: string };
  onSeedSampleOrders: () => void;
  onResetAllDemoData: () => void;
}

export function AdminSettingsTab({
  settings,
  demoConfig,
  orderCount,
  productCount,
  onSaveSettings,
  onExportJson,
  onImportJson,
  onSeedSampleOrders,
  onResetAllDemoData,
}: AdminSettingsTabProps) {
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [whatsappDisplay, setWhatsappDisplay] = useState(settings.whatsappDisplay);
  const [whatsappInternational, setWhatsappInternational] = useState(
    settings.whatsappInternational
  );
  const [whatsappDigits, setWhatsappDigits] = useState(settings.whatsappDigits);
  const [minNoticeHours, setMinNoticeHours] = useState(String(settings.minNoticeHours));
  const [depositPercentage, setDepositPercentage] = useState(
    String(settings.depositPercentage)
  );
  const [businessEmail, setBusinessEmail] = useState(settings.businessEmail);
  const [notificationEmail, setNotificationEmail] = useState(settings.notificationEmail);
  const [businessAddress, setBusinessAddress] = useState(settings.businessAddress);
  const [businessHours, setBusinessHours] = useState(settings.businessHours);
  const [deliveryFee, setDeliveryFee] = useState(
    settings.deliveryFee === null ? '' : String(settings.deliveryFee)
  );
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(
    settings.freeDeliveryThreshold === null ? '' : String(settings.freeDeliveryThreshold)
  );
  const [deliveryNotes, setDeliveryNotes] = useState(settings.deliveryNotes);
  const [paymentInstructions, setPaymentInstructions] = useState(
    settings.paymentInstructions
  );

  const [savedBanner, setSavedBanner] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const storageKb = (getDemoStorageSizeBytes() / 1024).toFixed(1);

  const inputClass =
    'w-full px-3 py-2 text-sm bg-[#FAFAF8] dark:bg-[#23221F] text-[#1C1917] dark:text-[#F5F4F0] placeholder:text-[#78716C] border border-[#D6D3CD] dark:border-[#3A3732] rounded-lg focus:bg-white dark:focus:bg-[#1B1A18] focus:border-[#164E37] dark:focus:border-[#5ED09E]';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedDelivery =
      deliveryFee.trim() === '' ? null : Math.max(0, Number(deliveryFee));
    const parsedThreshold =
      freeDeliveryThreshold.trim() === ''
        ? null
        : Math.max(0, Number(freeDeliveryThreshold));

    onSaveSettings({
      businessName: businessName.trim() || 'Simply Plattered',
      tagline: tagline.trim() || 'Freshly Prepared with Care, Perfect for Sharing.',
      whatsappDisplay: whatsappDisplay.trim() || '061 560 6932',
      whatsappInternational: whatsappInternational.trim() || '+27 61 560 6932',
      whatsappDigits: whatsappDigits.replace(/\D/g, '') || '27615606932',
      minNoticeHours: Math.max(1, Number(minNoticeHours) || 48),
      depositPercentage: Math.min(100, Math.max(0, Number(depositPercentage) || 50)),
      businessEmail: businessEmail.trim(),
      notificationEmail: notificationEmail.trim(),
      businessAddress: businessAddress.trim(),
      businessHours: businessHours.trim(),
      deliveryFee:
        parsedDelivery !== null && Number.isFinite(parsedDelivery) ? parsedDelivery : null,
      freeDeliveryThreshold:
        parsedThreshold !== null && Number.isFinite(parsedThreshold)
          ? parsedThreshold
          : null,
      deliveryNotes: deliveryNotes.trim(),
      paymentInstructions: paymentInstructions.trim(),
    });

    setSavedBanner(true);
    window.setTimeout(() => setSavedBanner(false), 3000);
  };

  const handleFileImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = onImportJson(String(reader.result || ''));
      if (result.ok) {
        setImportFeedback({
          type: 'ok',
          text: 'Demo backup imported successfully into this browser.',
        });
      } else {
        setImportFeedback({
          type: 'err',
          text: result.error || 'Import failed.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
          Business Settings &amp; Demo Data Tools
        </h2>
        <p className="text-sm text-[#57534E] dark:text-[#A8A29E] mt-0.5">
          Unconfirmed details (business email, address, delivery fee, business hours, payment
          instructions) start empty and can be configured here at any time.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-6 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-[#ECEAE4] dark:border-[#262522] pb-3">
          <h3 className="font-display text-lg font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
            Business Profile &amp; Policies
          </h3>
          {savedBanner && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#164E37] dark:text-[#5ED09E]">
              <Check className="w-4 h-4" />
              Saved to local browser storage
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
              Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
              WhatsApp Display Number
            </label>
            <input
              type="text"
              value={whatsappDisplay}
              onChange={(e) => setWhatsappDisplay(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
              WhatsApp International Number
            </label>
            <input
              type="text"
              value={whatsappInternational}
              onChange={(e) => setWhatsappInternational(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
              WhatsApp Link Digits (wa.me/...)
            </label>
            <input
              type="text"
              value={whatsappDigits}
              onChange={(e) => setWhatsappDigits(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Min Advance Notice (Hours)
              </label>
              <input
                type="number"
                min="1"
                value={minNoticeHours}
                onChange={(e) => setMinNoticeHours(e.target.value)}
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Deposit Policy (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={depositPercentage}
                onChange={(e) => setDepositPercentage(e.target.value)}
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#ECEAE4] dark:border-[#262522]">
          <h4 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-3">
            Owner-Configurable Details (Blank Until Confirmed)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Business Email (optional)
              </label>
              <input
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="Not configured yet"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Order Notification Recipient Email (for future live setup)
              </label>
              <input
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="Not configured yet"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Collection / Business Address
              </label>
              <input
                type="text"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Not configured yet"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Business Hours
              </label>
              <input
                type="text"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                placeholder="e.g. Mon–Sat 08:00–17:00"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Standard Delivery Fee (ZAR — leave blank for &quot;To be confirmed&quot;)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="Leave blank until owner sets fee"
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Free Delivery Threshold (ZAR — optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={freeDeliveryThreshold}
                onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                placeholder="Optional minimum order for free delivery"
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Delivery Area / Notes (optional)
              </label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Optional delivery radius or notes"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Manual Payment / EFT Instructions (printed on Order Confirmation PDF when set)
              </label>
              <textarea
                rows={3}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="Leave blank if payment details are shared manually via WhatsApp"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg transition-colors cursor-pointer"
          >
            Save Settings Locally
          </button>
        </div>
      </form>

      {/* Browser Storage Management & Backup */}
      <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-6 space-y-5">
        <div>
          <h3 className="font-display text-lg font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
            Local Browser Storage &amp; Demo Backup
          </h3>
          <p className="text-xs text-[#64605A] dark:text-[#A8A29E] mt-1 tabular-nums">
            Currently storing {productCount} platters and {orderCount} demo orders locally (~
            {storageKb} KB in localStorage).
            {demoConfig.lastExportedAt
              ? ` Last exported: ${formatDateTimeZA(demoConfig.lastExportedAt)}.`
              : ''}
          </p>
        </div>

        {importFeedback && (
          <div
            role="status"
            className={`p-3 text-sm rounded-lg border ${
              importFeedback.type === 'ok'
                ? 'bg-[#F0FDF4] dark:bg-[#0F291E] border-[#BBF7D0] dark:border-[#166534] text-[#166534] dark:text-[#86EFAC]'
                : 'bg-[#FEF2F2] dark:bg-[#2C1414] border-[#FECACA] dark:border-[#7F1D1D] text-[#991B1B] dark:text-[#FCA5A5]'
            }`}
          >
            {importFeedback.text}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExportJson}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#1C1917] dark:text-[#F5F4F0] bg-[#FAFAF8] dark:bg-[#23221F] border border-[#D6D3CD] dark:border-[#3A3732] hover:border-[#1C1917] dark:hover:border-[#A8A29E] rounded-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Demo JSON Backup
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#1C1917] dark:text-[#F5F4F0] bg-[#FAFAF8] dark:bg-[#23221F] border border-[#D6D3CD] dark:border-[#3A3732] hover:border-[#1C1917] dark:hover:border-[#A8A29E] rounded-lg cursor-pointer">
            <Upload className="w-4 h-4" />
            Import Demo JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleFileImport}
              className="sr-only"
            />
          </label>

          <button
            type="button"
            onClick={onSeedSampleOrders}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#164E37] dark:text-[#5ED09E] bg-[#164E37]/5 dark:bg-[#5ED09E]/10 hover:bg-[#164E37]/10 dark:hover:bg-[#5ED09E]/15 rounded-lg cursor-pointer"
          >
            Add 2 Sample Demo Orders
          </button>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#B91C1C] dark:text-[#FCA5A5] hover:bg-[#FEF2F2] dark:hover:bg-[#2C1414] rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All Demo Data
            </button>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-[#991B1B] dark:text-[#FCA5A5] font-medium">
                Clear all local demo data?
              </span>
              <button
                type="button"
                onClick={() => {
                  onResetAllDemoData();
                  setConfirmReset(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-md cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 text-xs font-medium text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F4F0] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
