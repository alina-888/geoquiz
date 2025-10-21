import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <div className="card">
        <div className="card-body">
          <h1 className="card-title h4 mb-3">{quiz.title} — Progress</h1>
          <p className="mb-3">
            Answered <strong>{answeredIds.size}</strong> / {quiz.questions?.length || 0}
          </p>

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
