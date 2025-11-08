import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getQuizDetail, updateQuiz } from '../api/api';

export default function QuizEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty_level: 1,
    estimated_duration: 10,
    category: 'other',
    is_published: false,
    is_geo: false,
  });
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
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load quiz');
        setLoading(false);
      });
  }, [id]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateQuiz(id, form);
      navigate(`/quizzes/${id}/`);
    } catch (err) {
      setError(err.message || 'Failed to update quiz');
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center mt-4">Loading...</p>;

  if (error && !form.title) {
    return (
      <div className="container mt-4" style={{ maxWidth: '700px' }}>
        <div className="alert alert-danger">{error}</div>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <h1 className="h4 fw-bold mb-4">Edit Quiz</h1>
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="mb-3">
          <label className="form-label">Title</label>
          <input name="title" value={form.title} onChange={onChange} className="form-control" required />
        </div>
        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea name="description" value={form.description} onChange={onChange} className="form-control" rows={4} />
        </div>
        <div className="mb-3">
          <label className="form-label">Difficulty</label>
          <select name="difficulty_level" value={form.difficulty_level} onChange={onChange} className="form-select">
            <option value={1}>Easy</option>
            <option value={2}>Medium</option>
            <option value={3}>Hard</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Estimated duration (minutes)</label>
          <input type="number" name="estimated_duration" value={form.estimated_duration} onChange={onChange} className="form-control" />
        </div>
        <div className="mb-3">
          <label className="form-label">Category</label>
          <select name="category" value={form.category} onChange={onChange} className="form-select">
            <option value="history">History</option>
            <option value="landmarks">Landmarks</option>
            <option value="culture">Culture</option>
            <option value="nature">Nature</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-check mb-3">
          <input id="is_published" type="checkbox" name="is_published" checked={form.is_published} onChange={onChange} className="form-check-input" />
          <label htmlFor="is_published" className="form-check-label">Published</label>
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
            This is a geo-quiz
          </label>
          {hasGeoQuestions && (
            <div className="form-text text-warning">
              Cannot change: This quiz has {(quiz?.questions || []).filter(q => q.geolocation).length} question(s) with geolocation data
            </div>
          )}
        </div>

        <div className="d-flex gap-2">
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Updating...' : 'Update Quiz'}
          </button>
          <button type="button" onClick={() => navigate(`/quizzes/${id}/`)} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
