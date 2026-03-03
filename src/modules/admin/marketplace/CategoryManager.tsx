import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Leaf, Apple, Citrus, Grape, Cherry, Banana, Sprout, Flower2, Flower, Carrot,
  Wheat, TreePine, Flame, Milk, Egg, Beef, Fish, Ham, Drumstick, Bone,
  Soup, Salad, Sandwich, Pizza, Cookie, Cake, Croissant, Candy, IceCreamCone, Nut,
  Bean, Coffee, Wine, CupSoda, GlassWater, Beer, UtensilsCrossed, Package,
  ShoppingBasket, Store, Warehouse, Sun, Droplets, Heart, Star, Zap, CircleDot,
  Tag, Box, Sparkles, ChevronUp, ChevronDown, ChevronRight, Lock, Unlock,
  Clipboard, Trash2, FolderOpen, Circle, AlertTriangle, HelpCircle, Info,
  Check, X, Download, Upload, Search, Maximize2, Minimize2, LayoutGrid, Pencil,
} from 'lucide-react';
import './CategoryManager.css';
import { API_BASE_URL } from '../../../config/api';

// ============ Types ============
type ViewMode = 'grid' | 'tree';
type SortField = 'name' | 'listingCount' | 'createdAt' | 'order';
type SortOrder = 'asc' | 'desc';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: React.ReactNode;
  color: string;
  parent: string | null;
  listingCount: number;
  active: boolean;
  featured: boolean;
  description: string;
  image?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
  metadata?: {
    seoTitle?: string;
    seoDescription?: string;
    keywords?: string[];
  };
}

interface CategoryFormData {
  name: string;
  slug: string;
  icon: React.ReactNode;
  color: string;
  parent: string | null;
  active: boolean;
  featured: boolean;
  description: string;
  image: string;
  metadata: {
    seoTitle: string;
    seoDescription: string;
    keywords: string[];
  };
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface DragState {
  isDragging: boolean;
  draggedId: string | null;
  targetId: string | null;
  position: 'before' | 'after' | 'inside' | null;
}

// ============ Constants ============
const ICON_OPTIONS: React.ReactNode[] = [
  <Leaf size={16} />,
  <Apple size={16} />,
  <Citrus size={16} />,
  <Grape size={16} />,
  <Cherry size={16} />,
  <Banana size={16} />,
  <Sprout size={16} />,
  <Flower2 size={16} />,
  <Flower size={16} />,
  <Carrot size={16} />,
  <Wheat size={16} />,
  <TreePine size={16} />,
  <Flame size={16} />,
  <Milk size={16} />,
  <Egg size={16} />,
  <Beef size={16} />,
  <Fish size={16} />,
  <Ham size={16} />,
  <Drumstick size={16} />,
  <Bone size={16} />,
  <Soup size={16} />,
  <Salad size={16} />,
  <Sandwich size={16} />,
  <Pizza size={16} />,
  <Cookie size={16} />,
  <Cake size={16} />,
  <Croissant size={16} />,
  <Candy size={16} />,
  <IceCreamCone size={16} />,
  <Nut size={16} />,
  <Bean size={16} />,
  <Coffee size={16} />,
  <Wine size={16} />,
  <CupSoda size={16} />,
  <GlassWater size={16} />,
  <Beer size={16} />,
  <UtensilsCrossed size={16} />,
  <Package size={16} />,
  <ShoppingBasket size={16} />,
  <Store size={16} />,
  <Warehouse size={16} />,
  <Sun size={16} />,
  <Droplets size={16} />,
  <Heart size={16} />,
  <Star size={16} />,
  <Zap size={16} />,
  <CircleDot size={16} />,
  <Tag size={16} />,
  <Box size={16} />,
  <Sparkles size={16} />,
];

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#78716c', '#64748b', '#475569',
];

const DEFAULT_CATEGORIES: Category[] = [];

const EMPTY_FORM: CategoryFormData = {
  name: '',
  slug: '',
  icon: <Package size={16} />,
  color: '#3b82f6',
  parent: null,
  active: true,
  featured: false,
  description: '',
  image: '',
  metadata: {
    seoTitle: '',
    seoDescription: '',
    keywords: [],
  },
};

// ============ Helper Functions ============
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// ============ Sub Components ============
const IconPicker: React.FC<{
  value: React.ReactNode;
  onChange: (icon: React.ReactNode) => void;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ value, onChange, isOpen, onToggle }) => {
  return (
    <div className="cm-icon-picker">
      <button className="cm-icon-picker__trigger" onClick={onToggle} type="button">
        <span className="cm-icon-picker__current">{value}</span>
        <span className="cm-icon-picker__arrow">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      
      {isOpen && (
        <div className="cm-icon-picker__dropdown">
          <div className="cm-icon-picker__grid">
            {ICON_OPTIONS.map((icon, index) => (
              <button
                key={index}
                type="button"
                className="cm-icon-picker__option"
                onClick={() => {
                  onChange(icon);
                  onToggle();
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ColorPicker: React.FC<{
  value: string;
  onChange: (color: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ value, onChange, isOpen, onToggle }) => {
  const [customColor, setCustomColor] = useState(value);

  return (
    <div className="cm-color-picker">
      <button className="cm-color-picker__trigger" onClick={onToggle} type="button">
        <span className="cm-color-picker__swatch" style={{ backgroundColor: value }} />
        <span className="cm-color-picker__value">{value}</span>
        <span className="cm-color-picker__arrow">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      
      {isOpen && (
        <div className="cm-color-picker__dropdown">
          <div className="cm-color-picker__custom">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#000000"
            />
            <button
              type="button"
              onClick={() => {
                onChange(customColor);
                onToggle();
              }}
            >
              Apply
            </button>
          </div>
          <div className="cm-color-picker__grid">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                className={`cm-color-picker__option ${value === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  onChange(color);
                  onToggle();
                }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CategoryTreeItem: React.FC<{
  category: Category;
  categories: Category[];
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (cat: Category) => void;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (cat: Category) => void;
  onToggleActive: (id: string) => void;
  onToggleFeatured: (id: string) => void;
  dragState: DragState;
  onDragStart: (id: string) => void;
  onDragOver: (id: string, position: 'before' | 'after' | 'inside') => void;
  onDragEnd: () => void;
  onDrop: () => void;
}> = ({
  category,
  categories,
  level,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onDelete,
  onDuplicate,
  onToggleActive,
  onToggleFeatured,
  dragState,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}) => {
  const children = categories.filter((c) => c.parent === category.id);
  const hasChildren = children.length > 0;
  const isDragged = dragState.draggedId === category.id;
  const isDropTarget = dragState.targetId === category.id;
  const dropPosition = isDropTarget ? dragState.position : null;

  const handleDragOver = (e: React.DragEvent, position: 'before' | 'after' | 'inside') => {
    e.preventDefault();
    e.stopPropagation();
    if (dragState.draggedId !== category.id) {
      onDragOver(category.id, position);
    }
  };

  return (
    <div className="cm-tree-item-wrapper">
      <div
        className={`cm-tree-item ${isSelected ? 'selected' : ''} ${isDragged ? 'dragging' : ''} ${!category.active ? 'inactive' : ''}`}
        style={{ paddingLeft: `${16 + level * 24}px` }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          onDragStart(category.id);
        }}
        onDragEnd={onDragEnd}
        onDrop={onDrop}
      >
        {/* Drop zones */}
        <div
          className={`cm-tree-item__drop-zone top ${dropPosition === 'before' ? 'active' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'before')}
        />
        <div
          className={`cm-tree-item__drop-zone bottom ${dropPosition === 'after' ? 'active' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'after')}
        />
        <div
          className={`cm-tree-item__drop-zone inside ${dropPosition === 'inside' ? 'active' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'inside')}
        />

        {/* Expand button */}
        <button
          className={`cm-tree-item__expand ${hasChildren ? 'has-children' : ''} ${isExpanded ? 'expanded' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(category.id);
          }}
        >
          {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : '•'}
        </button>

        {/* Category info */}
        <div className="cm-tree-item__content" onClick={() => onSelect(category)}>
          <span
            className="cm-tree-item__icon"
            style={{ backgroundColor: `${category.color}20`, color: category.color }}
          >
            {category.icon}
          </span>
          <div className="cm-tree-item__info">
            <span className="cm-tree-item__name">{category.name}</span>
            <span className="cm-tree-item__meta">
              {category.listingCount} listings
              {category.featured && <span className="cm-tree-item__featured"><Star size={12} /> Featured</span>}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <span className={`cm-tree-item__status ${category.active ? 'active' : 'inactive'}`}>
          {category.active ? 'Active' : 'Inactive'}
        </span>

        {/* Actions */}
        <div className="cm-tree-item__actions">
          <button
            className="cm-tree-item__action"
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(category.id);
            }}
            title={category.active ? 'Deactivate' : 'Activate'}
          >
            {category.active ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button
            className="cm-tree-item__action"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFeatured(category.id);
            }}
            title={category.featured ? 'Unfeature' : 'Feature'}
          >
            {category.featured ? <Star size={14} fill="currentColor" /> : <Star size={14} />}
          </button>
          <button
            className="cm-tree-item__action"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(category);
            }}
            title="Duplicate"
          >
            <Clipboard size={14} />
          </button>
          <button
            className="cm-tree-item__action danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(category.id);
            }}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="cm-tree-item__children">
          {children
            .sort((a, b) => a.order - b.order)
            .map((child) => (
              <CategoryTreeItem
                key={child.id}
                category={child}
                categories={categories}
                level={level + 1}
                isSelected={isSelected}
                isExpanded={isExpanded}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onToggleActive={onToggleActive}
                onToggleFeatured={onToggleFeatured}
                dragState={dragState}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                onDrop={onDrop}
              />
            ))}
        </div>
      )}
    </div>
  );
};

const CategoryCard: React.FC<{
  category: Category;
  isSelected: boolean;
  onSelect: (cat: Category) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
  childCount: number;
}> = ({ category, isSelected, onSelect, onDelete, onToggleActive, childCount }) => (
  <div
    className={`cm-card ${isSelected ? 'selected' : ''} ${!category.active ? 'inactive' : ''}`}
    onClick={() => onSelect(category)}
  >
    <div className="cm-card__header">
      <div
        className="cm-card__icon"
        style={{ backgroundColor: `${category.color}20`, color: category.color }}
      >
        {category.icon}
      </div>
      {category.featured && <span className="cm-card__featured"><Star size={14} /></span>}
    </div>
    <div className="cm-card__body">
      <h3 className="cm-card__name">{category.name}</h3>
      <p className="cm-card__description">{category.description || 'No description'}</p>
      <div className="cm-card__stats">
        <span className="cm-card__stat">
          <span className="cm-card__stat-icon"><Package size={14} /></span>
          {category.listingCount} listings
        </span>
        {childCount > 0 && (
          <span className="cm-card__stat">
            <span className="cm-card__stat-icon"><FolderOpen size={14} /></span>
            {childCount} subcategories
          </span>
        )}
      </div>
    </div>
    <div className="cm-card__footer">
      <span className={`cm-card__status ${category.active ? 'active' : 'inactive'}`}>
        {category.active ? <><Circle size={8} fill="currentColor" /> Active</> : <><Circle size={8} /> Inactive</>}
      </span>
      <div className="cm-card__actions">
        <button
          className="cm-card__action"
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive(category.id);
          }}
          title={category.active ? 'Deactivate' : 'Activate'}
        >
          {category.active ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
        <button
          className="cm-card__action danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(category.id);
          }}
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  </div>
);

const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ isOpen, title, message, confirmLabel, confirmVariant, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="cm-confirm-overlay" onClick={onCancel}>
      <div className="cm-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="cm-confirm-dialog__icon" data-variant={confirmVariant}>
          {confirmVariant === 'danger' ? <AlertTriangle size={20} /> : confirmVariant === 'warning' ? <HelpCircle size={20} /> : <Info size={20} />}
        </div>
        <h3 className="cm-confirm-dialog__title">{title}</h3>
        <p className="cm-confirm-dialog__message">{message}</p>
        <div className="cm-confirm-dialog__actions">
          <button
            className="cm-btn cm-btn--secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={`cm-btn cm-btn--${confirmVariant}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? <span className="btn-spinner" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss,
}) => (
  <div className="cm-toast-container">
    {toasts.map((toast) => (
      <div key={toast.id} className={`cm-toast cm-toast--${toast.type}`}>
        <span className="cm-toast__icon">
          {toast.type === 'success' && <Check size={14} />}
          {toast.type === 'error' && <X size={14} />}
          {toast.type === 'warning' && <AlertTriangle size={14} />}
          {toast.type === 'info' && <Info size={14} />}
        </span>
        <span className="cm-toast__message">{toast.message}</span>
        <button className="cm-toast__close" onClick={() => onDismiss(toast.id)}>
          ×
        </button>
      </div>
    ))}
  </div>
);

const CategoryPreview: React.FC<{
  category: Category;
  parentName: string | null;
}> = ({ category, parentName }) => (
  <div className="cm-preview">
    <div className="cm-preview__header">
      <span className="cm-preview__title">Preview</span>
    </div>
    <div className="cm-preview__card">
      <div
        className="cm-preview__icon"
        style={{ backgroundColor: `${category.color}20`, color: category.color }}
      >
        {category.icon}
      </div>
      <div className="cm-preview__info">
        <h3 className="cm-preview__name">{category.name || 'Category Name'}</h3>
        <p className="cm-preview__slug">/{category.slug || 'category-slug'}</p>
        {parentName && (
          <p className="cm-preview__parent">in {parentName}</p>
        )}
      </div>
      <p className="cm-preview__description">
        {category.description || 'Category description will appear here...'}
      </p>
      <div className="cm-preview__badges">
        {category.featured && <span className="cm-preview__badge featured"><Star size={12} /> Featured</span>}
        <span className={`cm-preview__badge ${category.active ? 'active' : 'inactive'}`}>
          {category.active ? <><Circle size={8} fill="currentColor" /> Active</> : <><Circle size={8} /> Inactive</>}
        </span>
      </div>
    </div>
  </div>
);

// ============ Main Component ============
const CategoryManager: React.FC = () => {
  // State
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch categories from API on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/marketplace/categories`);
        if (response.ok) {
          const data = await response.json();
          setCategories(Array.isArray(data) ? data : data.categories || []);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);
  const [form, setForm] = useState<CategoryFormData>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('order');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['1', '2']));
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmVariant: 'danger' | 'primary' | 'warning';
    onConfirm: () => void;
  } | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedId: null,
    targetId: null,
    position: null,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  // Toast functions
  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Statistics
  const statistics = useMemo(() => {
    const totalCategories = categories.length;
    const activeCategories = categories.filter((c) => c.active).length;
    const featuredCategories = categories.filter((c) => c.featured).length;
    const totalListings = categories.reduce((sum, c) => sum + c.listingCount, 0);
    const parentCategories = categories.filter((c) => !c.parent).length;

    return {
      total: totalCategories,
      active: activeCategories,
      inactive: totalCategories - activeCategories,
      featured: featuredCategories,
      listings: totalListings,
      parents: parentCategories,
      children: totalCategories - parentCategories,
    };
  }, [categories]);

  // Filtered and sorted categories
  const filteredCategories = useMemo(() => {
    let result = [...categories];

    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.description.toLowerCase().includes(search) ||
          c.slug.toLowerCase().includes(search)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'listingCount':
          comparison = a.listingCount - b.listingCount;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'order':
          comparison = a.order - b.order;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [categories, searchQuery, sortField, sortOrder]);

  // Root categories for tree view
  const rootCategories = useMemo(() => {
    return filteredCategories
      .filter((c) => !c.parent)
      .sort((a, b) => a.order - b.order);
  }, [filteredCategories]);

  // Get parent category name
  const getParentName = (parentId: string | null): string | null => {
    if (!parentId) return null;
    const parent = categories.find((c) => c.id === parentId);
    return parent ? parent.name : null;
  };

  // Handlers
  const handleSelect = (cat: Category) => {
    setSelectedId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      color: cat.color,
      parent: cat.parent,
      active: cat.active,
      featured: cat.featured,
      description: cat.description,
      image: cat.image || '',
      metadata: {
        seoTitle: cat.metadata?.seoTitle || '',
        seoDescription: cat.metadata?.seoDescription || '',
        keywords: cat.metadata?.keywords || [],
      },
    });
    setIsEditing(true);
    setShowIconPicker(false);
    setShowColorPicker(false);
    
    // Scroll to form on mobile
    if (window.innerWidth < 1024 && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNew = (parentId: string | null = null) => {
    setSelectedId(null);
    setForm({
      ...EMPTY_FORM,
      parent: parentId,
    });
    setIsEditing(true);
    setShowIconPicker(false);
    setShowColorPicker(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'Category name is required');
      return;
    }

    setIsLoading(true);
    
    const now = new Date().toISOString();
    const slug = form.slug || generateSlug(form.name);

    if (selectedId) {
      // Update existing
      setCategories((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? {
                ...c,
                ...form,
                slug,
                updatedAt: now,
              }
            : c
        )
      );
      showToast('success', `"${form.name}" updated successfully`);
    } else {
      // Create new
      const maxOrder = Math.max(...categories.filter((c) => c.parent === form.parent).map((c) => c.order), 0);
      const newCategory: Category = {
        id: Date.now().toString(),
        name: form.name,
        slug,
        icon: form.icon,
        color: form.color,
        parent: form.parent,
        active: form.active,
        featured: form.featured,
        description: form.description,
        image: form.image,
        listingCount: 0,
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
        metadata: form.metadata,
      };
      setCategories((prev) => [...prev, newCategory]);
      showToast('success', `"${form.name}" created successfully`);
    }

    setIsLoading(false);
    setForm(EMPTY_FORM);
    setIsEditing(false);
    setSelectedId(null);
  };

  const handleDelete = (id: string) => {
    const category = categories.find((c) => c.id === id);
    if (!category) return;

    const childCategories = categories.filter((c) => c.parent === id);
    const hasChildren = childCategories.length > 0;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Category',
      message: hasChildren
        ? `Are you sure you want to delete "${category.name}"? This will also delete ${childCategories.length} subcategories.`
        : `Are you sure you want to delete "${category.name}"?`,
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: () => {
        // Get all descendant IDs
        const getDescendantIds = (parentId: string): string[] => {
          const children = categories.filter((c) => c.parent === parentId);
          return [
            ...children.map((c) => c.id),
            ...children.flatMap((c) => getDescendantIds(c.id)),
          ];
        };

        const idsToDelete = [id, ...getDescendantIds(id)];
        setCategories((prev) => prev.filter((c) => !idsToDelete.includes(c.id)));

        if (selectedId && idsToDelete.includes(selectedId)) {
          setForm(EMPTY_FORM);
          setIsEditing(false);
          setSelectedId(null);
        }

        showToast('success', `"${category.name}" deleted successfully`);
        setConfirmDialog(null);
      },
    });
  };

  const handleDuplicate = (cat: Category) => {
    const now = new Date().toISOString();
    const newCategory: Category = {
      ...cat,
      id: Date.now().toString(),
      name: `${cat.name} (Copy)`,
      slug: `${cat.slug}-copy`,
      listingCount: 0,
      order: cat.order + 1,
      createdAt: now,
      updatedAt: now,
    };
    setCategories((prev) => [...prev, newCategory]);
    showToast('success', `"${cat.name}" duplicated`);
  };

  const handleToggleActive = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
    const category = categories.find((c) => c.id === id);
    if (category) {
      showToast('info', `"${category.name}" ${category.active ? 'deactivated' : 'activated'}`);
    }
  };

  const handleToggleFeatured = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, featured: !c.featured } : c))
    );
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleExpandAll = () => {
    const parentIds = categories.filter((c) => categories.some((child) => child.parent === c.id)).map((c) => c.id);
    setExpandedIds(new Set(parentIds));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  // Drag and drop handlers
  const handleDragStart = (id: string) => {
    setDragState({
      isDragging: true,
      draggedId: id,
      targetId: null,
      position: null,
    });
  };

  const handleDragOver = (id: string, position: 'before' | 'after' | 'inside') => {
    setDragState((prev) => ({
      ...prev,
      targetId: id,
      position,
    }));
  };

  const handleDragEnd = () => {
    setDragState({
      isDragging: false,
      draggedId: null,
      targetId: null,
      position: null,
    });
  };

  const handleDrop = () => {
    const { draggedId, targetId, position } = dragState;
    if (!draggedId || !targetId || !position || draggedId === targetId) {
      handleDragEnd();
      return;
    }

    setCategories((prev) => {
      const dragged = prev.find((c) => c.id === draggedId);
      const target = prev.find((c) => c.id === targetId);
      if (!dragged || !target) return prev;

      let newParent = target.parent;
      let newOrder = target.order;

      if (position === 'inside') {
        newParent = targetId;
        const children = prev.filter((c) => c.parent === targetId);
        newOrder = Math.max(...children.map((c) => c.order), 0) + 1;
      } else if (position === 'before') {
        newParent = target.parent;
        newOrder = target.order;
      } else {
        newParent = target.parent;
        newOrder = target.order + 1;
      }

      // Check for circular reference
      const checkCircular = (parentId: string | null): boolean => {
        if (!parentId) return false;
        if (parentId === draggedId) return true;
        const parent = prev.find((c) => c.id === parentId);
        return parent ? checkCircular(parent.parent) : false;
      };

      if (checkCircular(newParent)) {
        showToast('error', 'Cannot move category inside its own descendant');
        return prev;
      }

      return prev.map((c) => {
        if (c.id === draggedId) {
          return { ...c, parent: newParent, order: newOrder };
        }
        // Adjust order for siblings
        if (c.parent === newParent && c.id !== draggedId) {
          if (position === 'before' && c.order >= newOrder) {
            return { ...c, order: c.order + 1 };
          }
          if (position === 'after' && c.order > target.order) {
            return { ...c, order: c.order + 1 };
          }
        }
        return c;
      });
    });

    showToast('success', 'Category moved successfully');
    handleDragEnd();
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Categories',
      message: `Are you sure you want to delete ${selectedIds.size} categories? This cannot be undone.`,
      confirmLabel: 'Delete All',
      confirmVariant: 'danger',
      onConfirm: () => {
        setCategories((prev) => prev.filter((c) => !selectedIds.has(c.id)));
        setSelectedIds(new Set());
        showToast('success', `${selectedIds.size} categories deleted`);
        setConfirmDialog(null);
      },
    });
  };

  const handleBulkActivate = () => {
    setCategories((prev) =>
      prev.map((c) => (selectedIds.has(c.id) ? { ...c, active: true } : c))
    );
    showToast('success', `${selectedIds.size} categories activated`);
    setSelectedIds(new Set());
  };

  const handleBulkDeactivate = () => {
    setCategories((prev) =>
      prev.map((c) => (selectedIds.has(c.id) ? { ...c, active: false } : c))
    );
    showToast('success', `${selectedIds.size} categories deactivated`);
    setSelectedIds(new Set());
  };

  // Export/Import
  const handleExport = () => {
    const headers = ['ID', 'Name', 'Slug', 'Icon', 'Color', 'Parent', 'Active', 'Featured', 'Listings', 'Description'];
    const rows = categories.map(c => [
      c.id,
      c.name,
      c.slug,
      c.icon,
      c.color,
      c.parent || 'None',
      c.active ? 'Yes' : 'No',
      c.featured ? 'Yes' : 'No',
      c.listingCount,
      c.description || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Categories exported as CSV');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          setCategories(data);
          showToast('success', `${data.length} categories imported`);
        }
      } catch (err) {
        showToast('error', 'Invalid file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Auto-generate slug
  useEffect(() => {
    if (form.name && !selectedId) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
    }
  }, [form.name, selectedId]);

  // Current form preview
  const previewCategory: Category = {
    id: 'preview',
    name: form.name || 'Category Name',
    slug: form.slug || 'category-slug',
    icon: form.icon,
    color: form.color,
    parent: form.parent,
    active: form.active,
    featured: form.featured,
    description: form.description,
    listingCount: 0,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="category-manager">
      {/* Statistics */}
      <div className="cm-stats">
        <div className="cm-stat-card">
          <div className="cm-stat-card__icon"><FolderOpen size={20} /></div>
          <div className="cm-stat-card__content">
            <span className="cm-stat-card__value">{statistics.total}</span>
            <span className="cm-stat-card__label">Total Categories</span>
          </div>
        </div>
        <div className="cm-stat-card">
          <div className="cm-stat-card__icon"><Check size={20} /></div>
          <div className="cm-stat-card__content">
            <span className="cm-stat-card__value">{statistics.active}</span>
            <span className="cm-stat-card__label">Active</span>
          </div>
        </div>
        <div className="cm-stat-card">
          <div className="cm-stat-card__icon"><Star size={20} /></div>
          <div className="cm-stat-card__content">
            <span className="cm-stat-card__value">{statistics.featured}</span>
            <span className="cm-stat-card__label">Featured</span>
          </div>
        </div>
        <div className="cm-stat-card">
          <div className="cm-stat-card__icon"><Package size={20} /></div>
          <div className="cm-stat-card__content">
            <span className="cm-stat-card__value">{statistics.listings}</span>
            <span className="cm-stat-card__label">Total Listings</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="cm-header">
        <div className="cm-header__left">
          <h1 className="cm-header__title">Category Manager</h1>
          <p className="cm-header__subtitle">
            Organize and manage product categories
          </p>
        </div>
        <div className="cm-header__right">
          <label className="cm-header__import-btn">
            <input type="file" accept=".json" onChange={handleImport} hidden />
            <span><Download size={14} /> Import</span>
          </label>
          <button className="cm-btn cm-btn--secondary" onClick={handleExport}>
            <Upload size={14} /> Export
          </button>
          <button className="cm-btn cm-btn--primary" onClick={() => handleNew()}>
            + Add Category
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="cm-toolbar">
        <div className="cm-toolbar__left">
          <div className="cm-search">
            <span className="cm-search__icon"><Search size={14} /></span>
            <input
              type="text"
              className="cm-search__input"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="cm-search__clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <select
            className="cm-select"
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortField(field as SortField);
              setSortOrder(order as SortOrder);
            }}
          >
            <option value="order-asc">Default Order</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="listingCount-desc">Most Listings</option>
            <option value="listingCount-asc">Least Listings</option>
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
          </select>
        </div>

        <div className="cm-toolbar__right">
          {viewMode === 'tree' && (
            <>
              <button className="cm-toolbar__btn" onClick={handleExpandAll} title="Expand All">
                <Maximize2 size={14} />
              </button>
              <button className="cm-toolbar__btn" onClick={handleCollapseAll} title="Collapse All">
                <Minimize2 size={14} />
              </button>
            </>
          )}
          <div className="cm-view-toggle">
            <button
              className={`cm-view-btn ${viewMode === 'tree' ? 'active' : ''}`}
              onClick={() => setViewMode('tree')}
              title="Tree View"
            >
              <TreePine size={14} />
            </button>
            <button
              className={`cm-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="cm-bulk-actions">
          <span className="cm-bulk-actions__count">
            {selectedIds.size} selected
          </span>
          <div className="cm-bulk-actions__buttons">
            <button className="cm-bulk-btn" onClick={handleBulkActivate}>
              <Check size={14} /> Activate
            </button>
            <button className="cm-bulk-btn" onClick={handleBulkDeactivate}>
              <Circle size={12} /> Deactivate
            </button>
            <button className="cm-bulk-btn cm-bulk-btn--danger" onClick={handleBulkDelete}>
              <Trash2 size={14} /> Delete
            </button>
            <button className="cm-bulk-btn" onClick={() => setSelectedIds(new Set())}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="cm-content">
        {/* Category List/Tree */}
        <div className="cm-list-panel">
          <div className="cm-list-panel__header">
            <span className="cm-list-panel__title">
              Categories ({filteredCategories.length})
            </span>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="cm-empty-state">
              <span className="cm-empty-state__icon"><FolderOpen size={24} /></span>
              <h3>No categories found</h3>
              <p>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first category to get started'}
              </p>
              {!searchQuery && (
                <button className="cm-btn cm-btn--primary" onClick={() => handleNew()}>
                  + Create Category
                </button>
              )}
            </div>
          ) : viewMode === 'tree' ? (
            <div className="cm-tree">
              {rootCategories.map((category) => (
                <CategoryTreeItem
                  key={category.id}
                  category={category}
                  categories={filteredCategories}
                  level={0}
                  isSelected={selectedId === category.id}
                  isExpanded={expandedIds.has(category.id)}
                  onSelect={handleSelect}
                  onToggleExpand={handleToggleExpand}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onToggleActive={handleToggleActive}
                  onToggleFeatured={handleToggleFeatured}
                  dragState={dragState}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          ) : (
            <div className="cm-grid">
              {filteredCategories
                .filter((c) => !c.parent)
                .map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    isSelected={selectedId === category.id}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    childCount={categories.filter((c) => c.parent === category.id).length}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Form Panel */}
        <div className="cm-form-panel" ref={formRef}>
          <div className="cm-form-panel__header">
            <span className="cm-form-panel__title">
              {isEditing
                ? selectedId
                  ? 'Edit Category'
                  : 'New Category'
                : 'Category Details'}
            </span>
            {isEditing && (
              <button
                className="cm-form-panel__close"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedId(null);
                  setForm(EMPTY_FORM);
                }}
              >
                ×
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="cm-form">
              {/* Preview */}
              <CategoryPreview
                category={previewCategory}
                parentName={getParentName(form.parent)}
              />

              {/* Basic Info */}
              <div className="cm-form__section">
                <h4 className="cm-form__section-title">Basic Information</h4>
                
                <div className="cm-form__group">
                  <label className="cm-form__label">
                    Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="cm-form__input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter category name"
                  />
                </div>

                <div className="cm-form__group">
                  <label className="cm-form__label">Slug</label>
                  <div className="cm-form__input-with-prefix">
                    <span className="cm-form__prefix">/</span>
                    <input
                      type="text"
                      className="cm-form__input"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: generateSlug(e.target.value) })}
                      placeholder="category-slug"
                    />
                  </div>
                </div>

                <div className="cm-form__row">
                  <div className="cm-form__group">
                    <label className="cm-form__label">Icon</label>
                    <IconPicker
                      value={form.icon}
                      onChange={(icon) => setForm({ ...form, icon })}
                      isOpen={showIconPicker}
                      onToggle={() => {
                        setShowIconPicker(!showIconPicker);
                        setShowColorPicker(false);
                      }}
                    />
                  </div>

                  <div className="cm-form__group">
                    <label className="cm-form__label">Color</label>
                    <ColorPicker
                      value={form.color}
                      onChange={(color) => setForm({ ...form, color })}
                      isOpen={showColorPicker}
                      onToggle={() => {
                        setShowColorPicker(!showColorPicker);
                        setShowIconPicker(false);
                      }}
                    />
                  </div>
                </div>

                <div className="cm-form__group">
                  <label className="cm-form__label">Description</label>
                  <textarea
                    className="cm-form__textarea"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of this category"
                    rows={3}
                  />
                </div>

                <div className="cm-form__group">
                  <label className="cm-form__label">Parent Category</label>
                  <select
                    className="cm-form__select"
                    value={form.parent || ''}
                    onChange={(e) => setForm({ ...form, parent: e.target.value || null })}
                  >
                    <option value="">None (Top-level)</option>
                    {categories
                      .filter((c) => c.id !== selectedId && !c.parent)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Settings */}
              <div className="cm-form__section">
                <h4 className="cm-form__section-title">Settings</h4>

                <div className="cm-form__toggles">
                  <label className="cm-form__toggle">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    />
                    <span className="cm-form__toggle-slider" />
                    <span className="cm-form__toggle-label">
                      <span className="cm-form__toggle-title">Active</span>
                      <span className="cm-form__toggle-description">
                        Category is visible to users
                      </span>
                    </span>
                  </label>

                  <label className="cm-form__toggle">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    />
                    <span className="cm-form__toggle-slider" />
                    <span className="cm-form__toggle-label">
                      <span className="cm-form__toggle-title">Featured</span>
                      <span className="cm-form__toggle-description">
                        Show in featured sections
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="cm-form__section">
                <button
                  type="button"
                  className="cm-form__advanced-toggle"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <span>{showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Advanced Settings</span>
                </button>

                {showAdvanced && (
                  <div className="cm-form__advanced">
                    <div className="cm-form__group">
                      <label className="cm-form__label">SEO Title</label>
                      <input
                        type="text"
                        className="cm-form__input"
                        value={form.metadata.seoTitle}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            metadata: { ...form.metadata, seoTitle: e.target.value },
                          })
                        }
                        placeholder="SEO optimized title"
                      />
                    </div>

                    <div className="cm-form__group">
                      <label className="cm-form__label">SEO Description</label>
                      <textarea
                        className="cm-form__textarea"
                        value={form.metadata.seoDescription}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            metadata: { ...form.metadata, seoDescription: e.target.value },
                          })
                        }
                        placeholder="SEO meta description"
                        rows={2}
                      />
                    </div>

                    <div className="cm-form__group">
                      <label className="cm-form__label">Image URL</label>
                      <input
                        type="text"
                        className="cm-form__input"
                        value={form.image}
                        onChange={(e) => setForm({ ...form, image: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="cm-form__actions">
                <button
                  className="cm-btn cm-btn--secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedId(null);
                    setForm(EMPTY_FORM);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="cm-btn cm-btn--primary"
                  onClick={handleSave}
                  disabled={isLoading || !form.name.trim()}
                >
                  {isLoading ? (
                    <span className="btn-spinner" />
                  ) : selectedId ? (
                    'Save Changes'
                  ) : (
                    'Create Category'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="cm-form__placeholder">
              <span className="cm-form__placeholder-icon"><Pencil size={24} /></span>
              <p>Select a category to edit or create a new one</p>
              <button className="cm-btn cm-btn--primary" onClick={() => handleNew()}>
                + Create Category
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          confirmVariant={confirmDialog.confirmVariant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default CategoryManager;