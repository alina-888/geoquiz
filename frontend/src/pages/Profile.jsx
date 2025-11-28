import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchUserProfile, updateUserProfile, getQuizzesByCreator } from '../api/api';
import { isDebugMode, toggleDebugMode } from '../utils/geolocation';
import { useTranslation } from 'react-i18next';
import { getTranslatedText } from '../utils/translations';
import { getAvatarGradient } from '../utils/avatarUtils';
import { Camera, X } from 'lucide-react';
import './Profile.css';

export default function Profile() {
  const { username } = useParams();
  const authUsername = localStorage.getItem('auth.username');
  const canEdit = authUsername === username;
  const { t, i18n } = useTranslation();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ username: '', bio: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdQuizzes, setCreatedQuizzes] = useState([]);
  const [quizzesError, setQuizzesError] = useState('');
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetchUserProfile(username)
      .then((data) => {
        setProfile(data);
        setForm({ username: data.username || '', bio: data.bio || '' });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t('profile.failed'));
        setLoading(false);
      });
  }, [username, t]);

  useEffect(() => {
    if (!profile || !profile.id) return;
    setQuizzesError('');
    getQuizzesByCreator(profile.id)
      .then((resp) => {
        // API is paginated; handle both list and paginated shape
        const results = Array.isArray(resp) ? resp : resp?.results || [];
        setCreatedQuizzes(results);
      })
      .catch((err) => {
        setQuizzesError(err.message || 'Failed to load created quizzes');
      });
  }, [profile]);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePictureFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    // Show fullscreen when clicking on profile picture
    if (displayImage) {
      setShowFullscreen(true);
    }
  };

  const handleChangePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFullscreenClose = () => {
    setShowFullscreen(false);
  };

  const removeProfilePicture = () => {
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('username', form.username);
      formData.append('bio', form.bio);

      if (profilePictureFile) {
        formData.append('profile_picture', profilePictureFile);
      }

      const updated = await updateUserProfile(username, formData);
      setProfile(updated);
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
    } catch (err) {
      setError(err.message || t('profile.failed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center mt-4">{t('profile.loading')}</p>;
  if (error) return <div className="alert alert-danger mt-4">{error}</div>;
  if (!profile) return null;

  // Determine which image to show (use full image for fullscreen, thumbnail for avatar)
  const displayImage = profilePicturePreview || profile?.profile_thumbnail || profile?.profile_picture;
  const fullImage = profilePicturePreview || profile?.profile_picture;

  return (
    <>
      <div className="container mt-4" style={{ maxWidth: '600px' }}>
        <h1 className="h3 fw-bold mb-4">{t('profile.title')}</h1>

        <div className="card shadow-sm">
          <div className="card-body">
            {/* Profile Picture Section */}
            <div className="profile-picture-section mb-4">
              <div className="d-flex align-items-center gap-3">
                <div
                  className={`profile-avatar-large ${displayImage ? 'clickable' : ''}`}
                  onClick={handleImageClick}
                  style={{ cursor: displayImage ? 'pointer' : 'default' }}
                >
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={profile.username}
                      className="profile-avatar-img"
                    />
                  ) : (
                    <div
                      className="profile-avatar-placeholder"
                      style={{ background: getAvatarGradient(profile.username) }}
                    >
                      {profile.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                {canEdit && (
                  <div className="flex-grow-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={handleChangePhotoClick}
                  >
                    {t('profile.changePhoto')}
                  </button>
                  {(profilePicturePreview || profile.profile_picture) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger ms-2"
                      onClick={removeProfilePicture}
                    >
                      {t('profile.removePhoto')}
                    </button>
                  )}
                  <div className="small text-muted mt-2">
                    {t('profile.photoHint')}
                  </div>
                </div>
                )}
              </div>
            </div>

            <p><strong>{t('profile.email')}:</strong> {profile.email}</p>
            <p><strong>{t('profile.totalPoints')}:</strong> {profile.total_points}</p>

            {canEdit ? (
            <form onSubmit={onSave}>
              <div className="mb-3">
                <label className="form-label">{t('auth.register.username')}</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={onChange}
                  className="form-control"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('profile.bio')}</label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={onChange}
                  className="form-control"
                  rows={4}
                />
              </div>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? t('common.save') + '...' : t('common.save')}
              </button>
              {error && <div className="alert alert-danger mt-3">{error}</div>}
            </form>
          ) : (
            <>
              <p><strong>{t('auth.register.username')}:</strong> {profile.username}</p>
              <p><strong>{t('profile.bio')}:</strong> {profile.bio || '—'}</p>
            </>
            )}
          </div>
        </div>

      {/* Developer Tools - Only show when viewing your own profile */}
      {canEdit && (
        <div className="card shadow-sm mt-4 border-info">
          <div className="card-body">
            <h2 className="h5 mb-3">Developer Tools</h2>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>DEBUG Mode (Geolocation)</strong>
                <div className="small text-muted">
                  When enabled, bypasses all location checks for testing
                </div>
              </div>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="debugModeSwitch"
                  checked={isDebugMode()}
                  onChange={toggleDebugMode}
                  style={{ cursor: 'pointer', width: '3em', height: '1.5em' }}
                />
                <label className="form-check-label" htmlFor="debugModeSwitch"></label>
              </div>
            </div>
            {isDebugMode() && (
              <div className="alert alert-warning mt-3 mb-0">
                <small>
                  <strong>⚠ DEBUG mode is ON</strong> - All location-based questions will be unlocked regardless of your location.
                </small>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card shadow-sm mt-4">
        <div className="card-body">
          <h2 className="h5 mb-3">{t('profile.createdQuizzes')}</h2>
          {quizzesError && <div className="alert alert-danger">{quizzesError}</div>}
          {createdQuizzes.length === 0 ? (
            <p className="text-muted mb-0">No quizzes yet.</p>
          ) : (
            <ul className="list-group list-group-flush">
              {createdQuizzes.map((q) => (
                <li key={q.id} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                  <div>
                    <Link to={`/quizzes/${q.id}/`} className="text-decoration-none">{getTranslatedText(q, 'title', i18n.language)}</Link>
                    <div className="small text-muted">{t(`categories.${q.category}`)} • {t('quiz.detail.difficulty')} {t(`difficulty.${q.difficulty_level}`)}</div>
                    {/* Language badges */}
                    <div className="d-flex gap-1 flex-wrap mt-1">
                      <span className="badge bg-primary bg-opacity-75" style={{ fontSize: '0.65rem' }}>
                        {q.default_language?.toUpperCase() || 'EN'}
                      </span>
                      {q.translations && q.translations.map(tr => (
                        <span key={tr.language} className="badge border border-primary text-primary bg-white" style={{ fontSize: '0.65rem' }}>
                          {tr.language.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>

      {/* Fullscreen Image Modal */}
      {showFullscreen && fullImage && (
        <div className="fullscreen-image-modal" onClick={handleFullscreenClose}>
          <div className="close-button" onClick={handleFullscreenClose}>
            <X size={24} />
          </div>
          <img
            src={fullImage}
            alt={profile.username}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
