import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuiz } from '../api/api';

export default function QuizCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty_level: 1,
    estimated_duration: 10,
    category: 'other',
    is_published: false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdQuiz, setCreatedQuiz] = useState(null);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await createQuiz(form);
      setCreatedQuiz(created);
    } catch (err) {
      setError(err.message || 'Failed to create quiz');
    } finally {
      setSaving(false);
    }
  };

  

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <h1 className="h4 fw-bold mb-4">Create Quiz</h1>
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
          <label htmlFor="is_published" className="form-check-label">Publish immediately</label>
        </div>

        {!createdQuiz ? (
          <button type="submit" disabled={saving} className="btn btn-success">
            {saving ? 'Creating...' : 'Create'}
          </button>
        ) : (
          <div className="mt-4">
            <div className="alert alert-success d-flex align-items-center justify-content-between">
              <span>Quiz created! You can add questions on the next page.</span>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/quizzes/${createdQuiz.id}/questions/create/`)}>Go to Question Builder</button>
            </div>
          </div>
        )}
      </form>

    </div>
  );
}
