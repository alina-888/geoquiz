import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Image } from 'lucide-react';
import { getQuizDetail, updateQuiz } from '../api/api';
import { useTranslation } from 'react-i18next';

export default function QuizEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty_level: 1,
    estimated_duration: 10,
    category: 'other',
    is_published: false,
    is_geo: false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const imageInputRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [hasGeoQuestions, setHasGeoQuestions] = useState(false);

  // Load existing quiz data
  useEffect(() => {
    setLoading(true);
    getQuizDetail(id)
      .then((quizData) => {
        // Check if current user is the creator
        const currentUser = localStorage.getItem('auth.username');
        if (!quizData.creator_username || quizData.creator_username !== currentUser) {
          setError('You do not have permission to edit this quiz.');
          setLoading(false);
          return;
        }

        setQuiz(quizData);

        // Check if there are any questions with geolocation
        const geoQuestionsExist = (quizData.questions || []).some(q => q.geolocation);
        setHasGeoQuestions(geoQuestionsExist);

        // Pre-populate form with quiz data
        setForm({
          title: quizData.title || '',
          description: quizData.description || '',
          difficulty_level: quizData.difficulty_level || 1,
          estimated_duration: quizData.estimated_duration || 10,
          category: quizData.category || 'other',
          is_published: quizData.is_published || false,
          is_geo: quizData.is_geo || false,
        });

        // Load existing image (backend now returns full URL)
        if (quizData.image_url) {
          setExistingImageUrl(quizData.image_url);
        }

        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t('quiz.edit.failed'));
        setLoading(false);
      });
  }, [id, t]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setExistingImageUrl(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (imageFile) {
        payload.image = imageFile;
      }
      await updateQuiz(id, payload);
      navigate(`/quizzes/${id}/`);
    } catch (err) {
      setError(err.message || t('quiz.edit.failed'));
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center mt-4">{t('common.loading')}</p>;

  if (error && !form.title) {
    return (
      <div className="container mt-4" style={{ maxWidth: '700px' }}>
        <div className="alert alert-danger">{error}</div>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <h1 className="h4 fw-bold mb-4">{t('quiz.edit.title')}</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="form-label">{t('quiz.create.titleField')}</label>
          <input name="title" value={form.title} onChange={onChange} className="form-control" required />
        </div>
        <div className="mb-3">
          <label className="form-label">{t('quiz.create.description')}</label>
          <textarea name="description" value={form.description} onChange={onChange} className="form-control" rows={4} />
        </div>
        <div className="mb-3">
          <label className="form-label">{t('quiz.create.difficulty')}</label>
          <select name="difficulty_level" value={form.difficulty_level} onChange={onChange} className="form-select">
            <option value={1}>{t('quiz.create.easy')}</option>
            <option value={2}>{t('quiz.create.medium')}</option>
            <option value={3}>{t('quiz.create.hard')}</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">{t('quiz.create.duration')}</label>
          <input type="number" name="estimated_duration" value={form.estimated_duration} onChange={onChange} className="form-control" />
        </div>
        <div className="mb-3">
          <label className="form-label">{t('quiz.create.category')}</label>
          <select name="category" value={form.category} onChange={onChange} className="form-select">
            <option value="history">{t('quiz.create.categoryHistory')}</option>
            <option value="landmarks">{t('quiz.create.categoryLandmarks')}</option>
            <option value="culture">{t('quiz.create.categoryCulture')}</option>
            <option value="nature">{t('quiz.create.categoryNature')}</option>
            <option value="other">{t('quiz.create.categoryOther')}</option>
          </select>
        </div>
        <div className="form-check mb-3">
          <input id="is_published" type="checkbox" name="is_published" checked={form.is_published} onChange={onChange} className="form-check-input" />
          <label htmlFor="is_published" className="form-check-label">{t('quiz.create.publishImmediately')}</label>
        </div>

        <div className="form-check mb-3">
          <input
            id="is_geo"
            type="checkbox"
            name="is_geo"
            checked={form.is_geo}
            onChange={onChange}
            disabled={hasGeoQuestions}
            className="form-check-input"
          />
          <label htmlFor="is_geo" className="form-check-label">
            {t('quiz.create.isGeoQuiz')}
          </label>
          {hasGeoQuestions && (
            <div className="form-text text-warning">
              Cannot change: This quiz has {(quiz?.questions || []).filter(q => q.geolocation).length} question(s) with geolocation data
            </div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label d-block fw-semibold">{t('quiz.create.quizImage')}</label>
          <div
            className={`border rounded p-3 text-center ${imageFile || existingImageUrl ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'}`}
            style={{ cursor: 'pointer', transition: 'all 0.2s', maxWidth: '400px' }}
            onClick={() => imageInputRef.current?.click()}
            onMouseEnter={(e) => !imageFile && !existingImageUrl && (e.currentTarget.style.borderColor = '#0d6efd')}
            onMouseLeave={(e) => !imageFile && !existingImageUrl && (e.currentTarget.style.borderColor = '')}
          >
            <Image size={32} className="mb-2 text-secondary" />
            <div className="fw-semibold mb-2">{t('quiz.create.quizCoverImage')}</div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />
            {imageFile ? (
              <div className="mt-2">
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="Quiz cover"
                  style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px' }}
                  className="mb-2"
                />
                <div className="d-flex align-items-center justify-content-between mt-2 px-2 py-1 bg-white rounded">
                  <div className="small text-truncate flex-grow-1" title={imageFile.name}>{imageFile.name}</div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeImage(); }}
                    className="btn btn-sm btn-outline-danger ms-2"
                    style={{ padding: '0.1rem 0.3rem', fontSize: '0.75rem' }}
                  >×</button>
                </div>
              </div>
            ) : existingImageUrl ? (
              <div className="mt-2">
                <img
                  src={existingImageUrl}
                  alt="Existing quiz cover"
                  style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'contain', borderRadius: '4px' }}
                  className="mb-2"
                />
                <div className="d-flex align-items-center justify-content-between mt-2 px-2 py-1 bg-white rounded">
                  <div className="small text-info flex-grow-1">Current image</div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeImage(); }}
                    className="btn btn-sm btn-outline-danger ms-2"
                    style={{ padding: '0.1rem 0.3rem', fontSize: '0.75rem' }}
                  >×</button>
                </div>
              </div>
            ) : (
              <div className="small text-muted">{t('quiz.create.clickToUpload')}</div>
            )}
          </div>
        </div>

        <div className="d-flex gap-2">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? t('quiz.edit.saving') : t('quiz.edit.save')}
          </button>
          <button type="button" onClick={() => navigate(`/quizzes/${id}/`)} className="btn btn-secondary">
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
