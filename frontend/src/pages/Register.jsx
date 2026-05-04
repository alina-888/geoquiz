import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api/api';
import { useTranslation } from 'react-i18next';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerUser(form);
      navigate('/login');
    } catch (err) {
      setError(err.message || t('auth.register.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card p-4 shadow" style={{ width: '22rem' }}>
        <h1 className="h5 mb-3 text-center">{t('auth.register.title')}</h1>
        {error && <div className="alert alert-danger py-1">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">{t('auth.register.username')}</label>
            <input name="username" value={form.username} onChange={onChange} className="form-control" required />
          </div>
          <div className="mb-3">
            <label className="form-label">{t('auth.register.email')}</label>
            <input type="email" name="email" value={form.email} onChange={onChange} className="form-control" required />
          </div>
          <div className="mb-3">
            <label className="form-label">{t('auth.register.password')}</label>
            <input type="password" name="password" value={form.password} onChange={onChange} className="form-control" required />
          </div>
          <button type="submit" disabled={loading} className="btn btn-success w-100">
            {loading ? t('auth.register.submitting') : t('auth.register.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
