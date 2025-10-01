import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuiz, createQuestion } from '../api/api';

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
  const [questionWarning, setQuestionWarning] = useState('');

  // Question builder state
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('multiple_choice');
  const [qPoints, setQPoints] = useState(10);
  const [qCorrect, setQCorrect] = useState('');
  const [options, setOptions] = useState([
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]);

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

  const addOption = () => setOptions([...options, { option_text: '', is_correct: false }]);
  const updateOption = (idx, key, value) => {
    const copy = options.slice();
    copy[idx] = { ...copy[idx], [key]: value };
    setOptions(copy);
  };
  const removeOption = (idx) => setOptions(options.filter((_, i) => i !== idx));

  const onAddQuestion = async (e) => {
    e.preventDefault();
    if (!createdQuiz) return;
    // Client-side validation for multiple choice: must have at least one correct option
    if (qType === 'multiple_choice') {
      const nonEmptyOptions = options.filter(o => o.option_text.trim().length > 0);
      const hasCorrect = nonEmptyOptions.some(o => o.is_correct);
      if (!hasCorrect) {
        setQuestionWarning('Please select at least one correct option for multiple choice.');
        return;
      }
    }
    // Validation for true/false: require a selection
    if (qType === 'true_false' && (!qCorrect || String(qCorrect).trim() === '')) {
      setQuestionWarning('Please select True or False as the correct answer.');
      return;
    }
    setSaving(true);
    setError('');
    setQuestionWarning('');
    try {
      const payload = {
        question_text: qText,
        points_value: qPoints,
        question_type: qType,
        correct_answer: qType !== 'multiple_choice' ? qCorrect : undefined,
        options: qType === 'multiple_choice' ? options.filter(o => o.option_text.trim().length > 0) : [],
      };
      await createQuestion(createdQuiz.id, payload);
      // reset question builder
      setQText('');
      setQPoints(10);
      setQType('multiple_choice');
      setQCorrect('');
      setOptions([
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
      ]);
    } catch (err) {
      setError(err.message || 'Failed to add question');
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
          <div className="alert alert-success">Quiz created! You can add questions below.</div>
        )}
      </form>

      {createdQuiz && (
        <div className="mt-5">
          <h2 className="h5 mb-3">Add Questions</h2>
          <form onSubmit={onAddQuestion}>
            <div className="mb-3">
              <label className="form-label">Question text</label>
              <textarea value={qText} onChange={(e)=>setQText(e.target.value)} className="form-control" rows={3} required />
            </div>

            <div className="row mb-3">
              <div className="col">
                <label className="form-label">Type</label>
                <select value={qType} onChange={(e)=>setQType(e.target.value)} className="form-select">
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="text">Text</option>
                  <option value="true_false">True/False</option>
                </select>
              </div>
              <div className="col">
                <label className="form-label">Points</label>
                <input type="number" value={qPoints} onChange={(e)=>setQPoints(Number(e.target.value))} className="form-control" />
              </div>
            </div>

            {qType === 'text' ? (
              <div className="mb-3">
                <label className="form-label">Correct answer</label>
                <input value={qCorrect} onChange={(e)=>setQCorrect(e.target.value)} className="form-control" />
              </div>
            ) : qType === 'true_false' ? (
              <div className="mb-3">
                <label className="form-label d-block">Correct answer</label>
                {questionWarning && (
                  <div className="alert alert-warning py-2 mb-2">{questionWarning}</div>
                )}
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="tf-correct"
                    id="tf-true"
                    value="true"
                    checked={qCorrect === 'true'}
                    onChange={(e)=>setQCorrect(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="tf-true">True</label>
                </div>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="tf-correct"
                    id="tf-false"
                    value="false"
                    checked={qCorrect === 'false'}
                    onChange={(e)=>setQCorrect(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor="tf-false">False</label>
                </div>
              </div>
            ) : (
              <div className="mb-3">
                <label className="form-label">Options</label>
              {questionWarning && (
                <div className="alert alert-warning py-2 mb-2">{questionWarning}</div>
              )}
                {options.map((opt, idx) => (
                  <div key={idx} className="d-flex align-items-center mb-2 gap-2">
                    <input
                      value={opt.option_text}
                      onChange={(e)=>updateOption(idx, 'option_text', e.target.value)}
                      className="form-control"
                      placeholder={`Option ${idx+1}`}
                    />
                    <div className="form-check mb-0">
                      <input type="checkbox" checked={opt.is_correct} onChange={(e)=>updateOption(idx, 'is_correct', e.target.checked)} className="form-check-input" id={`opt-${idx}`} />
                      <label className="form-check-label" htmlFor={`opt-${idx}`}>Correct</label>
                    </div>
                    <button type="button" onClick={()=>removeOption(idx)} className="btn btn-outline-danger btn-sm">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={addOption} className="btn btn-link p-0">+ Add option</button>
              </div>
            )}

            <div className="d-flex gap-2">
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Adding...' : 'Add question'}</button>
              <button type="button" onClick={()=>navigate(`/quizzes/${createdQuiz.id}/`)} className="btn btn-secondary">Done</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
