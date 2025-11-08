import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import QuizDetail from './pages/QuizDetail';
import QuizCreate from './pages/QuizCreate';
import QuizEdit from './pages/QuizEdit';
import QuizProgress from './pages/QuizProgress';
import QuestionCreate from './pages/QuestionCreate';
import Question from './pages/Question';
import QuizComplete from './pages/QuizComplete';
import QuizResults from './pages/QuizResults';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import { logoutUser } from './api/api';
import React from 'react';

function App() {
  const [username, setUsername] = React.useState(localStorage.getItem('auth.username'));

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (_) {}
    localStorage.removeItem('auth.username');
    setUsername(null);
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
                      Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/register" className="nav-link">
                      Register
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
                      Logout
                    </button>
                  </li>
                </>
              )}
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
        <Route path="/quizzes/:id/" element={<QuizDetail />} />
        <Route path="/quizzes/:id/start/" element={<QuizProgress />} />
        <Route path="/quizzes/:id/progress/" element={<QuizProgress />} />
        <Route path="/quizzes/:id/question/:questionId/" element={<Question />} />
        <Route path="/quizzes/:id/complete/" element={<QuizComplete />} />
        <Route path="/quizzes/:id/results/" element={<QuizResults />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile/:username" element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;
