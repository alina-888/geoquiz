import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createQuestion, getQuizDetail } from '../api/api';

export default function QuestionCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const quizId = Number(id);

  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [questionWarning, setQuestionWarning] = useState('');

  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('multiple_choice');
  const [qPoints, setQPoints] = useState(10);
  const [qCorrect, setQCorrect] = useState('');
  const [options, setOptions] = useState([
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]);

  useEffect(() => {
    let mounted = true;
    async function fetchQuiz() {
      try {
        const detail = await getQuizDetail(quizId);
        if (mounted) setQuiz(detail);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load quiz');
      }
    }
    if (quizId) fetchQuiz();
    return () => {
      mounted = false;
    };
  }, [quizId]);

  const addOption = () => setOptions([...options, { option_text: '', is_correct: false }]);
  const updateOption = (idx, key, value) => {
    const copy = options.slice();
    copy[idx] = { ...copy[idx], [key]: value };
    setOptions(copy);
  };
  const removeOption = (idx) => setOptions(options.filter((_, i) => i !== idx));

  const onAddQuestion = async (e) => {
    e.preventDefault();
    if (!quiz) return;
    if (qType === 'multiple_choice') {
      const nonEmptyOptions = options.filter(o => o.option_text.trim().length > 0);
      const hasCorrect = nonEmptyOptions.some(o => o.is_correct);
      if (!hasCorrect) {
        setQuestionWarning('Please select at least one correct option for multiple choice.');
        return;
      }
    }
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
      await createQuestion(quiz.id, payload);
      setQText('');
      setQPoints(10);
      setQType('multiple_choice');
      setQCorrect('');
      setOptions([
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
      ]);
      // Refresh quiz details to update question count
      try {
        const detail = await getQuizDetail(quiz.id);
        setQuiz(detail);
      } catch (_) {}
    } catch (err) {
      setError(err.message || 'Failed to add question');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <h1 className="h4 fw-bold mb-2">Add Questions</h1>
      <div className="text-muted mb-3">Creating question #{(quiz?.questions?.length || 0) + 1}</div>
      {quiz && (
        <div className="alert alert-info">Adding questions to: <strong>{quiz.title}</strong></div>
      )}
      {error && <div className="alert alert-danger">{error}</div>}

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
          <button type="button" onClick={()=>navigate(`/quizzes/${quizId}/`)} className="btn btn-secondary">Done</button>
        </div>
      </form>
    </div>
  );
}


