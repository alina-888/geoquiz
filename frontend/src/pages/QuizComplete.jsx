import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { completeQuiz, getQuizProgress, getQuizDetail } from '../api/api';

export default function QuizComplete() {
  const { id } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      try {
        const [q] = await Promise.all([getQuizDetail(id)]);
        setQuiz(q);
        // try to complete; if already completed, just fetch progress
        try {
          const completed = await completeQuiz(id);
          setAttempt(completed);
        } catch (_) {
          const att = await getQuizProgress(id);
          setAttempt(att);
        }
      } catch (err) {
        setError(err.message || 'Failed to finalize quiz');
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [id]);

  if (loading) return <p className="text-center mt-4">Loading...</p>;
  if (error) return <div className="alert alert-danger mt-4">{error}</div>;
  if (!attempt || !quiz) return null;

  return (
    <div className="container mt-4" style={{ maxWidth: '600px' }}>
      <h1 className="h4 fw-bold mb-3">{quiz.title} — Completed</h1>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <p><strong>Score:</strong> {attempt.score}</p>
          <p><strong>Completion:</strong> {Math.round(attempt.completion_percentage)}%</p>
          <p><strong>Status:</strong> {attempt.status}</p>
        </div>
      </div>

      <div className="d-flex gap-3">
        <Link to={`/quizzes/${id}/results/`} className="btn btn-outline-primary">
          View detailed results
        </Link>
        <Link to="/" className="btn btn-outline-secondary">
          Back to quizzes
        </Link>
      </div>
    </div>
  );
}
