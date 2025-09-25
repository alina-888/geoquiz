import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizQuestion, answerQuizQuestion, getQuizDetail, getQuizProgress } from '../api/api';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function Question() {
  const { id, questionId } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getQuizDetail(id), getQuizQuestion(id, questionId), getQuizProgress(id)])
      .then(([q, qu, att]) => {
        setQuiz(q);
        setQuestion(qu);
        setAttempt(att);
        setLoading(false);
        // Reset local answer state when question changes
        setSelectedOption(null);
        setTextAnswer('');
      })
      .catch((err) => {
        setError(err.message || 'Failed to load question');
        setLoading(false);
      });
  }, [id, questionId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = selectedOption ? { option: selectedOption } : { text: textAnswer };
      await answerQuizQuestion(id, questionId, payload);
      const updated = await getQuizProgress(id);
      const answeredIds = new Set((updated.answers || []).map(a => a.question));
      const next = (quiz.questions || []).find(q => !answeredIds.has(q.id));
      if (next) navigate(`/quizzes/${id}/question/${next.id}/`);
      else navigate(`/quizzes/${id}/complete/`);
    } catch (err) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center mt-4">Loading...</p>;
  if (error) return <div className="alert alert-danger mt-4">{error}</div>;
  if (!question) return null;

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <div className="card shadow-sm">
        <div className="card-body">
          <h1 className="h4 fw-bold mb-3">{question.question_text}</h1>

          <form onSubmit={onSubmit}>
            {question.question_type === 'multiple_choice' ? (
              <div className="mb-3">
                {(question.options || []).map(opt => (
                  <div className="form-check" key={opt.id}>
                    <input
                      className="form-check-input"
                      type="radio"
                      name="option"
                      value={opt.id}
                      id={`option-${opt.id}`}
                      onChange={() => setSelectedOption(opt.id)}
                    />
                    <label className="form-check-label" htmlFor={`option-${opt.id}`}>
                      {opt.option_text}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-3">
                <label className="form-label">Your answer</label>
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  className="form-control"
                  rows={4}
                />
              </div>
            )}

            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
