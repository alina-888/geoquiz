import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchUserProfile, updateUserProfile } from '../api/api';

export default function Profile() {
  const { username } = useParams();
  const authUsername = localStorage.getItem('auth.username');
  const canEdit = authUsername === username;

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ username: '', bio: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchUserProfile(username)
      .then((data) => {
        setProfile(data);
        setForm({ username: data.username || '', bio: data.bio || '' });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load profile');
        setLoading(false);
      });
  }, [username]);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateUserProfile(username, { username: form.username, bio: form.bio });
      setProfile(updated);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center mt-4">Loading...</p>;
  if (error) return <div className="alert alert-danger mt-4">{error}</div>;
  if (!profile) return null;

  return (
    <div className="container mt-4" style={{ maxWidth: '600px' }}>
      <h1 className="h3 fw-bold mb-4">Profile</h1>

      <div className="card shadow-sm">
        <div className="card-body">
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Total points:</strong> {profile.total_points}</p>

          {canEdit ? (
            <form onSubmit={onSave}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  className="form-control"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Bio</label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={onChange}
                  className="form-control"
                  rows={4}
                />
              </div>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : 'Save'}
              </button>
              {error && <div className="alert alert-danger mt-3">{error}</div>}
            </form>
          ) : (
            <>
              <p><strong>Username:</strong> {profile.username}</p>
              <p><strong>Bio:</strong> {profile.bio || '—'}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
