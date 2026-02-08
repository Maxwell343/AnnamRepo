import React, { useState } from 'react';
import './CategoryManager.css';

interface Category {
  id: string;
  name: string;
  icon: string;
  parent: string | null;
  listingCount: number;
  active: boolean;
  description: string;
}

const defaultCategories: Category[] = [
  { id: '1', name: 'Vegetables', icon: '🥬', parent: null, listingCount: 48, active: true, description: 'Fresh vegetables from local farms' },
  { id: '2', name: 'Fruits', icon: '🍎', parent: null, listingCount: 35, active: true, description: 'Seasonal and exotic fruits' },
  { id: '3', name: 'Grains & Cereals', icon: '🌾', parent: null, listingCount: 22, active: true, description: 'Rice, wheat, millets and more' },
  { id: '4', name: 'Dairy', icon: '🥛', parent: null, listingCount: 18, active: true, description: 'Milk, cheese, paneer, curd' },
  { id: '5', name: 'Prepared Food', icon: '🍲', parent: null, listingCount: 12, active: false, description: 'Ready-to-eat and cooked items' },
  { id: '6', name: 'Spices & Herbs', icon: '🌿', parent: null, listingCount: 15, active: true, description: 'Fresh and dried spices' },
];

const emptyForm: Omit<Category, 'id' | 'listingCount'> = {
  name: '',
  icon: '',
  parent: null,
  active: true,
  description: '',
};

const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  const handleSelect = (cat: Category) => {
    setSelectedId(cat.id);
    setForm({ name: cat.name, icon: cat.icon, parent: cat.parent, active: cat.active, description: cat.description });
    setIsEditing(true);
  };

  const handleNew = () => {
    setSelectedId(null);
    setForm(emptyForm);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (selectedId) {
      setCategories((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, ...form } : c))
      );
    } else {
      setCategories((prev) => [
        ...prev,
        { ...form, id: Date.now().toString(), listingCount: 0 },
      ]);
    }
    setForm(emptyForm);
    setIsEditing(false);
    setSelectedId(null);
  };

  const handleDelete = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) {
      setForm(emptyForm);
      setIsEditing(false);
      setSelectedId(null);
    }
  };

  return (
    <div className="category-manager">
      <div className="category-manager__header">
        <h1>Category Manager</h1>
        <button className="admin-btn admin-btn--primary" onClick={handleNew}>+ Add Category</button>
      </div>

      <div className="category-manager__grid">
        {/* Category Tree */}
        <div className="category-tree">
          <div className="category-tree__title">Categories ({categories.length})</div>
          <ul className="category-tree__list">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className={`category-tree__item ${selectedId === cat.id ? 'category-tree__item--active' : ''}`}
                onClick={() => handleSelect(cat)}
              >
                <div className="category-tree__item-info">
                  <span className="category-tree__icon">{cat.icon}</span>
                  <span className="category-tree__name">{cat.name}</span>
                  {!cat.active && (
                    <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 500 }}>Disabled</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="category-tree__count">{cat.listingCount}</span>
                  <button
                    className="category-tree__action-btn"
                    title="Delete"
                    onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }}
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Category Form */}
        <div className="category-form">
          <div className="category-form__title">
            {isEditing ? (selectedId ? 'Edit Category' : 'New Category') : 'Select a category to edit'}
          </div>

          {isEditing ? (
            <>
              <div className="category-form__group">
                <label className="category-form__label">Name</label>
                <input
                  className="category-form__input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="E.g. Vegetables"
                />
              </div>
              <div className="category-form__group">
                <label className="category-form__label">Icon (emoji)</label>
                <input
                  className="category-form__input"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="🥬"
                />
              </div>
              <div className="category-form__group">
                <label className="category-form__label">Description</label>
                <textarea
                  className="category-form__textarea"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of this category"
                />
              </div>
              <div className="category-form__group">
                <label className="category-form__label">Parent Category</label>
                <select
                  className="category-form__select"
                  value={form.parent || ''}
                  onChange={(e) => setForm({ ...form, parent: e.target.value || null })}
                >
                  <option value="">None (Top-level)</option>
                  {categories
                    .filter((c) => c.id !== selectedId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                </select>
              </div>
              <div className="category-form__group">
                <div className="category-form__toggle">
                  <label className="category-form__switch">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    />
                    <span className="category-form__switch-slider" />
                  </label>
                  <span style={{ fontSize: 14, color: '#374151' }}>Active</span>
                </div>
              </div>
              <div className="category-form__actions">
                <button
                  className="admin-btn admin-btn--secondary"
                  onClick={() => { setIsEditing(false); setSelectedId(null); setForm(emptyForm); }}
                >
                  Cancel
                </button>
                <button className="admin-btn admin-btn--primary" onClick={handleSave}>
                  {selectedId ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 40 }}>
              Click a category on the left to edit, or press "Add Category" to create a new one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
