# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GeoQuiz is a full-stack quiz application built with Django REST Framework (backend) and React (frontend). The application supports both standard quizzes and geography-based quizzes with geolocation features, multiple question types, media attachments (images/audio/video), and user authentication.

## Development Commands

### Backend (Django)
All backend commands should be run from the `backend/` directory:

```bash
cd backend
python manage.py runserver          # Start development server (http://localhost:8000)
python manage.py makemigrations     # Create new migrations
python manage.py migrate            # Apply migrations
python manage.py createsuperuser    # Create admin user
python manage.py test               # Run tests
python manage.py shell              # Interactive Python shell with Django context
```

### Frontend (React)
All frontend commands should be run from the `frontend/` directory:

```bash
cd frontend
npm start                           # Start development server (http://localhost:3000)
npm test                            # Run tests
npm run build                       # Build for production
```

### Dependencies
- Backend: Install from root-level `requirements.txt` using `pip install -r requirements.txt`
- Frontend: Install from `frontend/package.json` using `npm install` in the frontend directory

## Architecture

### Backend Structure

The Django backend uses two main apps:

**1. `users` app** - Custom user authentication
- `CustomUser` model extends Django's `AbstractUser` with email, profile_picture, total_points, and bio
- Session-based authentication (SessionAuthentication)
- Views: RegisterView, LoginView, LogoutView, ProfileView (all APIView-based)
- Custom user model is set in settings: `AUTH_USER_MODEL = 'users.CustomUser'`

**2. `quizzes` app** - Core quiz functionality
- Models:
  - `Quiz`: Main quiz entity with difficulty, category, is_published flag, and `is_geo` flag for geography quizzes
  - `Question`: Supports multiple question types (text, multiple_choice, true_false) with media attachments (image/audio/video - only ONE per question) and optional geolocation (JSON field)
  - `Option`: Multiple choice options for questions
  - `QuizAttempt`: Tracks user quiz sessions with status (not_started, in_progress, completed, abandoned)
  - `UserAnswer`: Individual question answers within an attempt
- ViewSets use DRF routers with custom actions for quiz flow (start_attempt, submit_answer, complete)
- Filtering via `django-filter` with custom `QuizFilter` class
- Pagination: `StandardResultsSetPagination` (page_size=20, max=100)
- Permissions: `IsOwnerOrReadOnly` custom permission

### Key Backend Logic

**Quiz Access Control** (quizzes/views.py:37-43):
- Published quizzes are visible to everyone
- Creators can see their own unpublished quizzes
- Uses `Q` objects for conditional filtering

**Media Validation** (quizzes/models.py:64-87):
- Questions enforce only ONE media type per question (image OR audio OR video)
- Validation includes file extension checks
- Properties: `has_media`, `media_type`, `get_media_url()`

**Geolocation Validation** (quizzes/serializers.py:31-49):
- Geolocation data is ONLY allowed on questions if the parent quiz has `is_geo=True`
- Validated in `QuestionSerializer`

**Answer Checking** (quizzes/views.py:53-71):
- Text normalization with `_normalize_text()` (strip, casefold)
- Boolean conversion with `_to_bool_like()` supporting various true/false formats

### Frontend Structure

React SPA using React Router with these main pages:
- `Home.jsx` - Quiz listing/browsing
- `QuizCreate.jsx` / `QuestionCreate.jsx` - Quiz/question creation flow
- `QuizDetail.jsx` - Quiz overview before starting
- `QuizProgress.jsx` - Active quiz interface
- `Question.jsx` - Individual question view
- `QuizComplete.jsx` / `QuizResults.jsx` - Post-quiz results
- `Login.jsx` / `Register.jsx` / `Profile.jsx` - User management
- `LocationPicker.jsx` - Map interface for geolocation (uses Leaflet)

**API Communication**:
- Centralized in `frontend/src/api/api.js`
- Uses fetch with credentials for session auth
- Base URL: `http://localhost:8000/api/`

**Authentication State**:
- Managed via `localStorage.getItem('auth.username')`
- Username displayed in navbar when logged in

### API Structure

Main URL patterns:
- `/admin/` - Django admin interface
- `/api/` - Quiz endpoints (quizzes.urls)
  - `/api/quizzes/` - Quiz CRUD
  - `/api/questions/` - Question CRUD
  - `/api/attempts/` - Quiz attempts
  - `/api/quizzes/<id>/start/` - Start quiz attempt
  - `/api/quizzes/<id>/progress/` - Get current attempt progress
  - `/api/quizzes/<id>/question/<question_id>/` - Get specific question
  - `/api/quizzes/<id>/question/<question_id>/answer/` - Submit answer
  - `/api/quizzes/<id>/complete/` - Complete quiz
- `/api/users/` - User authentication endpoints
- `/media/` - Uploaded media files (served in DEBUG mode)

### Database

- SQLite database at `backend/db.sqlite3`
- Media files stored in `backend/media/` with subdirectories:
  - `question_media/images/`
  - `question_media/audio/`
  - `question_media/videos/`
  - `profile_pictures/`

### Configuration

**CORS Settings** (settings.py:121-129):
- Frontend origin: `http://localhost:3000`
- Credentials enabled for session auth
- CSRF trusted origins configured

**DRF Settings** (settings.py:79-86):
- SessionAuthentication by default
- AllowAny permissions (controlled at view level)

## Important Implementation Notes

- **Geo vs Non-Geo Quizzes**: Always check `quiz.is_geo` before allowing geolocation data on questions
- **Media Upload**: Use multipart/form-data for questions with media; options may arrive as JSON string and need parsing
- **Question Ordering**: Questions use `question_order` field with unique_together constraint on (quiz, question_order)
- **Quiz Flow**: Start attempt → Submit answers → Complete attempt (updates end_time, score, completion_percentage, status)
- **Custom User Model**: Always import user as `from users.models import CustomUser` or use `get_user_model()`
