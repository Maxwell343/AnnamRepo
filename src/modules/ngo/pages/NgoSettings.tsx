import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Save, RotateCcw } from 'lucide-react';
import { API_ENDPOINTS } from '../../../config/api';
import './NgoSettings.css';

type SettingsForm = {
  organizationName: string;
  organizationEmail: string;
  organizationPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  mission: string;
  causeAreas: string;
};

type User = {
  id: string | number;
  name: string;
  email?: string;
  role: string;
};

const defaultForm: SettingsForm = {
  organizationName: '',
  organizationEmail: '',
  organizationPhone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  adminName: '',
  adminEmail: '',
  adminPhone: '',
  mission: '',
  causeAreas: '',
};

const NgoSettings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SettingsForm>(defaultForm);
  const [initialForm, setInitialForm] = useState<SettingsForm>(defaultForm);

  const user = useMemo<User | null>(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'ngo') {
      navigate('/auth');
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(API_ENDPOINTS.ngoSettings(String(user.id)));
        const data = await res.json();

        const mapped: SettingsForm = {
          organizationName: data.organization_name || '',
          organizationEmail: data.organization_email || '',
          organizationPhone: data.organization_phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          adminName: data.admin_name || user.name || '',
          adminEmail: data.admin_email || user.email || '',
          adminPhone: data.admin_phone || '',
          mission: data.mission || '',
          causeAreas: Array.isArray(data.cause_areas) ? data.cause_areas.join(', ') : (data.cause_areas || ''),
        };

        setForm(mapped);
        setInitialForm(mapped);
      } catch {
        const fallback = {
          ...defaultForm,
          adminName: user.name || '',
          adminEmail: user.email || '',
        };
        setForm(fallback);
        setInitialForm(fallback);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate, user]);

  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onReset = () => {
    setForm(initialForm);
  };

  const onSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const payload = {
        ngo_id: user.id,
        organization_name: form.organizationName,
        organization_email: form.organizationEmail,
        organization_phone: form.organizationPhone,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        admin_name: form.adminName,
        admin_email: form.adminEmail,
        admin_phone: form.adminPhone,
        mission: form.mission,
        cause_areas: form.causeAreas
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      };

      const res = await fetch(API_ENDPOINTS.ngoSettings(String(user.id)), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to save NGO settings');
      }

      setInitialForm(form);
      localStorage.setItem('ngoSettings', JSON.stringify(form));

      if (returnTo) {
        navigate(returnTo);
        return;
      }

      alert('NGO settings saved');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save settings';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="ngo-settings-page">Loading NGO settings...</div>;
  }

  return (
    <div className="ngo-settings-page">
      <div className="ngo-settings-card">
        <div className="ngo-settings-header">
          <h1>NGO Settings</h1>
          <p>Update your NGO profile and contact details.</p>
        </div>

        <div className="ngo-settings-grid">
          <label>
            Organization Name
            <input name="organizationName" value={form.organizationName} onChange={onChange} />
          </label>
          <label>
            Organization Email
            <input name="organizationEmail" value={form.organizationEmail} onChange={onChange} />
          </label>
          <label>
            Organization Phone
            <input name="organizationPhone" value={form.organizationPhone} onChange={onChange} />
          </label>
          <label>
            Admin Name
            <input name="adminName" value={form.adminName} onChange={onChange} />
          </label>
          <label>
            Admin Email
            <input name="adminEmail" value={form.adminEmail} onChange={onChange} />
          </label>
          <label>
            Admin Phone
            <input name="adminPhone" value={form.adminPhone} onChange={onChange} />
          </label>
          <label>
            City
            <input name="city" value={form.city} onChange={onChange} />
          </label>
          <label>
            State
            <input name="state" value={form.state} onChange={onChange} />
          </label>
          <label>
            Pincode
            <input name="pincode" value={form.pincode} onChange={onChange} />
          </label>
          <label className="span-2">
            Address
            <input name="address" value={form.address} onChange={onChange} />
          </label>
          <label className="span-2">
            Mission
            <textarea name="mission" value={form.mission} onChange={onChange} rows={3} />
          </label>
          <label className="span-2">
            Cause Areas (comma-separated)
            <input name="causeAreas" value={form.causeAreas} onChange={onChange} />
          </label>
        </div>

        <div className="ngo-settings-actions">
          <button type="button" className="secondary" onClick={onReset} disabled={!hasChanges || saving}>
            <RotateCcw size={14} /> Reset
          </button>
          <button type="button" className="primary" onClick={onSave} disabled={!hasChanges || saving}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NgoSettings;
