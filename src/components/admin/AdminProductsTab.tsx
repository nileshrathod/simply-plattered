import { ChangeEvent, FormEvent, useState } from 'react';
import { Edit2, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { PlatterProduct } from '../../types/simplyPlattered';
import { formatZAR } from '../../lib/formatters';
import { PlatterImage } from '../PlatterImage';

interface AdminProductsTabProps {
  products: PlatterProduct[];
  onToggleAvailability: (productId: string) => void;
  onUpdateProduct: (
    productId: string,
    updates: Partial<Omit<PlatterProduct, 'id'>>
  ) => void;
  onAddProduct: (
    input: Omit<PlatterProduct, 'id' | 'slug' | 'sortOrder' | 'updatedAt'>
  ) => void;
  onDeleteProduct: (productId: string) => void;
}

interface ProductFormState {
  name: string;
  shortTag: string;
  servesText: string;
  price: string;
  description: string;
  itemsText: string;
  available: boolean;
  customImageDataUrl?: string;
}

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser canvas unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function AdminProductsTab({
  products,
  onToggleAvailability,
  onUpdateProduct,
  onAddProduct,
  onDeleteProduct,
}: AdminProductsTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<ProductFormState>({
    name: '',
    shortTag: '',
    servesText: 'Serves 2 People',
    price: '',
    description: '',
    itemsText: '',
    available: true,
    customImageDataUrl: undefined,
  });

  const sortedProducts = [...products].sort((a, b) => a.sortOrder - b.sortOrder);

  const openEdit = (product: PlatterProduct) => {
    setIsCreating(false);
    setEditingId(product.id);
    setFormError('');
    setForm({
      name: product.name,
      shortTag: product.shortTag,
      servesText: product.servesText,
      price: String(product.price),
      description: product.description,
      itemsText: product.items.join('\n'),
      available: product.available,
      customImageDataUrl: product.customImageDataUrl,
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setIsCreating(true);
    setFormError('');
    setForm({
      name: '',
      shortTag: 'Custom Platter',
      servesText: 'Serves 2 People',
      price: '',
      description: '',
      itemsText: '',
      available: true,
      customImageDataUrl: undefined,
    });
  };

  const closeForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormError('');
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid PNG, JPG, or WebP image file.');
      return;
    }
    try {
      const dataUrl = await compressImageFile(file);
      setForm((prev) => ({ ...prev, customImageDataUrl: dataUrl }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not process image.');
    }
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const numericPrice = Number(form.price);
    if (!form.name.trim()) {
      setFormError('Platter name is required.');
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setFormError('Please enter a valid price in South African Rand.');
      return;
    }

    const items = form.itemsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (items.length === 0) {
      setFormError('Please enter at least one platter item (one item per line).');
      return;
    }

    if (isCreating) {
      onAddProduct({
        name: form.name.trim(),
        shortTag: form.shortTag.trim() || 'Festive Platter',
        servesText: form.servesText.trim() || 'Serves 2 People',
        price: Math.round(numericPrice * 100) / 100,
        description: form.description.trim(),
        items,
        available: form.available,
        customImageDataUrl: form.customImageDataUrl,
      });
    } else if (editingId) {
      onUpdateProduct(editingId, {
        name: form.name.trim(),
        shortTag: form.shortTag.trim(),
        servesText: form.servesText.trim(),
        price: Math.round(numericPrice * 100) / 100,
        description: form.description.trim(),
        items,
        available: form.available,
        customImageDataUrl: form.customImageDataUrl,
      });
    }

    closeForm();
  };

  const inputClass =
    'w-full px-3 py-2 text-sm bg-[#FAFAF8] dark:bg-[#23221F] text-[#1C1917] dark:text-[#F5F4F0] placeholder:text-[#78716C] border border-[#D6D3CD] dark:border-[#3A3732] rounded-lg focus:bg-white dark:focus:bg-[#1B1A18] focus:border-[#164E37] dark:focus:border-[#5ED09E]';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
            Platter Catalogue (Local CMS)
          </h2>
          <p className="text-sm text-[#57534E] dark:text-[#A8A29E] mt-0.5">
            Edit prices, platter items, or toggle availability. Changes persist in this browser and
            update the storefront immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          Add Platter
        </button>
      </div>

      {(isCreating || editingId) && (
        <form
          onSubmit={handleSave}
          className="bg-white dark:bg-[#1B1A18] border border-[#164E37]/40 dark:border-[#5ED09E]/40 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#ECEAE4] dark:border-[#262522] pb-3">
            <h3 className="font-display text-lg font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
              {isCreating ? 'Add New Demo Platter' : `Edit Platter: ${form.name}`}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close editor"
              className="p-1.5 text-[#64605A] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F4F0] rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              className="p-3 text-sm text-[#991B1B] dark:text-[#FCA5A5] bg-[#FEF2F2] dark:bg-[#2C1414] border border-[#FECACA] dark:border-[#7F1D1D] rounded-lg"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Platter Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Price (ZAR) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Servings Label *
              </label>
              <input
                type="text"
                required
                value={form.servesText}
                onChange={(e) => setForm((p) => ({ ...p, servesText: e.target.value }))}
                placeholder="e.g. Serves 2 People"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
              Short Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                Included Food Items (one item per line) *
              </label>
              <textarea
                rows={7}
                required
                value={form.itemsText}
                onChange={(e) => setForm((p) => ({ ...p, itemsText: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                  Optional Custom Photo (stored locally in browser)
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] bg-[#FAFAF8] dark:bg-[#23221F] border border-[#D6D3CD] dark:border-[#3A3732] hover:border-[#1C1917] dark:hover:border-[#A8A29E] rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>
                  {form.customImageDataUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({ ...p, customImageDataUrl: undefined }))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#64605A] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F4F0] cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Revert to Default Poster Crop
                    </button>
                  )}
                </div>
                {form.customImageDataUrl && (
                  <img
                    src={form.customImageDataUrl}
                    alt="Uploaded platter preview"
                    className="mt-3 h-28 w-40 object-cover rounded-lg border border-[#E5E2DC] dark:border-[#2D2B27]"
                  />
                )}
              </div>

              <label className="flex items-center gap-2.5 text-sm text-[#1C1917] dark:text-[#F5F4F0] pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) => setForm((p) => ({ ...p, available: e.target.checked }))}
                  className="w-4 h-4 accent-[#164E37]"
                />
                <span>Available for customers to order</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#ECEAE4] dark:border-[#262522]">
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 text-sm font-medium text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F4F0] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg transition-colors cursor-pointer"
            >
              Save Platter Changes
            </button>
          </div>
        </form>
      )}

      {/* Platter Catalogue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl overflow-hidden flex flex-col"
          >
            <PlatterImage product={product} />
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between gap-2 text-xs text-[#64605A] dark:text-[#A8A29E]">
                <span>{product.servesText}</span>
                <span
                  className={
                    product.available
                      ? 'font-semibold text-[#164E37] dark:text-[#5ED09E]'
                      : 'font-semibold text-[#B91C1C] dark:text-[#FCA5A5]'
                  }
                >
                  {product.available ? 'Available' : 'Hidden / Unavailable'}
                </span>
              </div>

              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <h3 className="font-display text-lg font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                  {product.name}
                </h3>
                <span className="font-mono text-base font-semibold text-[#164E37] dark:text-[#5ED09E] tabular-nums">
                  {formatZAR(product.price)}
                </span>
              </div>

              <p className="mt-2 text-xs text-[#57534E] dark:text-[#D6D3CD] flex-1">
                {product.items.join(' · ')}
              </p>

              <div className="mt-4 pt-4 border-t border-[#ECEAE4] dark:border-[#262522] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onToggleAvailability(product.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-[#D6D3CD] dark:border-[#3A3732] hover:border-[#1C1917] dark:hover:border-[#A8A29E] text-[#1C1917] dark:text-[#F5F4F0] transition-colors cursor-pointer"
                >
                  {product.available ? 'Mark Unavailable' : 'Mark Available'}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(product)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#164E37] dark:text-[#5ED09E] hover:bg-[#164E37]/5 dark:hover:bg-[#5ED09E]/10 rounded-md cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteProduct(product.id)}
                      aria-label={`Delete ${product.name}`}
                      className="p-1.5 text-[#78716C] dark:text-[#A8A29E] hover:text-[#B91C1C] dark:hover:text-[#FCA5A5] rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
