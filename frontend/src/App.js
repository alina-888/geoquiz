import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import QuizDetail from './pages/QuizDetail';
import QuizCreate from './pages/QuizCreate';
import QuizEdit from './pages/QuizEdit';
import QuizProgress from './pages/QuizProgress';
import QuestionCreate from './pages/QuestionCreate';
import QuestionEdit from './pages/QuestionEdit';
import Question from './pages/Question';
import QuizComplete from './pages/QuizComplete';
import QuizResults from './pages/QuizResults';
import QuizReviews from './pages/QuizReviews';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import { logoutUser, whoAmI } from './api/api';
import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';

function App() {
  const [username, setUsername] = React.useState(null);
  const { t } = useTranslation();

  // Keep localStorage in sync with auth state. Several pages (Profile,
  // Question, QuizDetail, QuizEdit, QuestionEdit) read auth.username directly
  // from localStorage to decide whether the viewer can edit, so we must
  // populate it on login/whoAmI and clear it on logout.
  const updateAuth = React.useCallback((name) => {
    setUsername(name);
    if (name) {
      localStorage.setItem('auth.username', name);
    } else {
      localStorage.removeItem('auth.username');
    }
  }, []);

  React.useEffect(() => {
    whoAmI()
      .then(data => updateAuth(data.is_authenticated ? data.username : null))
      .catch(() => updateAuth(null));
  }, [updateAuth]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (_) {}
    updateAuth(null);
  };

  return (
    <Router>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          {/* Логотип / название */}
          <Link to="/" className="navbar-brand fw-bold">
            GeoQuiz
          </Link>

          {/* Кнопка-бургер для мобилок */}
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Основное меню */}
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              {!username ? (
                <>
                  <li className="nav-item">
                    <Link to="/login" className="nav-link">
                      {t('navbar.login')}
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/register" className="nav-link">
                      {t('navbar.register')}
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link
                      to={`/profile/${encodeURIComponent(username)}`}
                      className="nav-link"
                    >
                      {username}
                    </Link>
                  </li>
                  <li className="nav-item">
                    <button onClick={handleLogout} className="btn btn-outline-danger ms-2">
                      {t('navbar.logout')}
                    </button>
                  </li>
                </>
              )}
              <li className="nav-item ms-2">
                <LanguageSwitcher />
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Роуты */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quizzes/create/" element={<QuizCreate />} />
        <Route path="/quizzes/:id/edit" element={<QuizEdit />} />
        <Route path="/quizzes/:id/questions/create/" element={<QuestionCreate />} />
        <Route path="/quizzes/:quizId/questions/:questionId/edit" element={<QuestionEdit />} />
        <Route path="/quizzes/:id/" element={<QuizDetail />} />
        <Route path="/quizzes/:id/reviews" element={<QuizReviews />} />
        <Route path="/quizzes/:id/start/" element={<QuizProgress />} />
        <Route path="/quizzes/:id/progress/" element={<QuizProgress />} />
        <Route path="/quizzes/:id/question/:questionId/" element={<Question />} />
        <Route path="/quizzes/:id/complete/" element={<QuizComplete />} />
        <Route path="/quizzes/:id/results/" element={<QuizResults />} />
        <Route path="/login" element={<Login onLogin={updateAuth} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile/:username" element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;
