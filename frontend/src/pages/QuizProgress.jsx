import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { getQuizProgress, getQuizDetail } from '../api/api';

export default function QuizProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([getQuizProgress(id), getQuizDetail(id)])
      .then(([att, q]) => {
        setAttempt(att);
        setQuiz(q);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load progress');
        setLoading(false);
      });
  }, [id]);

  // Auto-redirect to the first question if user hasn't answered anything yet
  useEffect(() => {
    if (!loading && attempt && quiz) {
      const answeredIds = new Set((attempt.answers || []).map(a => a.question));
      const nextQuestion = (quiz.questions || []).find(q => !answeredIds.has(q.id));
      if (answeredIds.size === 0 && nextQuestion) {
        navigate(`/quizzes/${id}/question/${nextQuestion.id}/`);
      }
    }
  }, [loading, attempt, quiz, navigate, id]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 alert alert-danger">{error}</div>;
  if (!attempt || !quiz) return null;

  const answeredIds = new Set((attempt.answers || []).map(a => a.question));
  const nextQuestion = (quiz.questions || []).find(q => !answeredIds.has(q.id));
  const lockedQuestionsCount = (quiz.questions || []).filter(q => q.geolocation).length;

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <div className="card">
        <div className="card-body">
          <h1 className="card-title h4 mb-3">{quiz.title} — Progress</h1>
          <p className="mb-3">
            Answered <strong>{answeredIds.size}</strong> / {quiz.questions?.length || 0}
          </p>

          {lockedQuestionsCount > 0 && (
            <div className="alert alert-info mb-3">
              <Lock size={16} className="me-2" style={{ display: 'inline' }} />
              This quiz has <strong>{lockedQuestionsCount}</strong> location-based {lockedQuestionsCount === 1 ? 'question' : 'questions'}
            </div>
          )}

          {/* Question list */}
          {quiz.questions && quiz.questions.length > 0 && (
            <div className="mb-3">
              <h6 className="mb-2">Questions:</h6>
              <div className="list-group">
                {quiz.questions.map((q, index) => {
                  const isAnswered = answeredIds.has(q.id);
                  const isCurrent = nextQuestion && nextQuestion.id === q.id;
                  return (
                    <div
                      key={q.id}
                      className={`list-group-item d-flex justify-content-between align-items-center ${isCurrent ? 'active' : ''}`}
                    >
                      <div>
                        <span className="me-2">Question {index + 1}</span>
                        {q.geolocation && (
                          <Lock size={14} className="text-warning" style={{ display: 'inline' }} title="Location-based question" />
                        )}
                      </div>
                      <div>
                        {isAnswered && <span className="badge bg-success">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {nextQuestion ? (
            <button
              onClick={() => navigate(`/quizzes/${id}/question/${nextQuestion.id}/`)}
              className="btn btn-primary"
            >
              Continue
            </button>
          ) : (
            <Link to={`/quizzes/${id}/complete/`} className="btn btn-outline-success">
              Finish
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
