🔴 CRITICAL SECURITY ISSUES

  1. Hardcoded Secret Key in Version Control

  File: settings.py:23
  SECRET_KEY = 'django-insecure-nxrlw0q#k01!m*pgydb6vj#ik#mx-k_-h_y&-t#a1ip14p!%eq'
  This is catastrophic. Anyone with repo access can forge sessions, decrypt cookies, and sign malicious data. This key is likely already in your git history.

  Fix: Use environment variables immediately. Rotate the key. Audit all session data.

  2. DEBUG=True with No Environment Check

  File: settings.py:26
  DEBUG = True
  Exposes full stack traces, internal paths, settings, and SQL queries to attackers.

  3. ALLOWED_HOSTS Empty

  File: settings.py:28
  ALLOWED_HOSTS = []
  HTTP Host header attacks possible. Also breaks in production.

  4. AllowAny as Default Permission

  File: settings.py:92-94
  'DEFAULT_PERMISSION_CLASSES': [
      'rest_framework.permissions.AllowAny',
  ],
  Every endpoint is open by default. Developers must remember to add permissions manually. This is backwards - default should be secure.

  5. Excessive Debug Logging in Production Code

  File: views.py:127-249
  Over 30 print() statements logging:
  - User IDs
  - Quiz IDs
  - Request data
  - File information
  - Tracebacks

  This leaks sensitive data to server logs and potentially to attackers.

  6. Missing Rate Limiting

  No rate limiting anywhere. Attackers can:
  - Brute force login
  - Spam quiz creation
  - DoS the file upload endpoints
  - Scrape all quizzes

  7. Magic Bytes Validation Disabled

  File: validators.py:122-131
  def validate_mime_type(file, allowed_mimes, file_type='file'):
      # MIME validation removed due to python-magic dependency conflicts
      return None
  The magic bytes check is defined but rarely called. Attackers can upload disguised executables.

  ---
  🟠 HIGH SEVERITY ISSUES

  8. localStorage for Auth State (XSS Vulnerable)

  File: Login.jsx:20
  localStorage.setItem('auth.username', username);
  Any XSS vulnerability will expose the auth state. Use httpOnly cookies exclusively.

  9. No CSRF Token Rotation on Login

  File: users/views.py:27-30
  logout(request)
  login(request, user)
  The CSRF token should be rotated after login to prevent session fixation.

  10. Translation ViewSets Missing Update/Delete Permissions

  File: views.py:1181-1286
  perform_create checks permissions, but perform_update and perform_destroy don't exist. Any authenticated user can modify any translation.

  11. User ID Exposed in Login Response

  File: users/views.py:31-35
  return Response({
      "message": "Login successful",
      "username": user.username,
      "user_id": user.id  # Enumeration risk
  })

  12. Points Double-Counted on Complete

  File: views.py:392-394 and views.py:420-421
  attempt.user.total_points += total_points
  attempt.user.save()
  This runs in both submit_answer_nested (when auto-completing) AND complete_by_quiz. If both code paths trigger, points are added twice.

  ---
  🟡 MEDIUM SEVERITY ISSUES

  13. N+1 Query Problems

  File: validators.py:286-307
  for media in media_files:
      if media.file:
          try:
              total_size += media.file.size
  Iterates every media file for every upload. Should use aggregate().

  14. SQLite in Production-Ready Codebase

  File: settings.py:104-108
  SQLite doesn't support concurrent writes well. One user uploading media blocks all others.

  15. No Pagination on Several Endpoints

  user_ratings action at views.py:620 has pagination, but get_queryset returns all with no limit protection if pagination fails.

  16. Missing Index on Frequently Queried Fields

  Models like Question query by quiz + question_order but only have unique_together, not an explicit index.

  17. Synchronous Thumbnail Generation

  File: models.py:93-116
  Image processing blocks the request thread. Should use Celery or similar.

  18. Duplicate Code Everywhere

  - Answer validation logic appears in 3 places (submit_answer_nested, submit_answer, QuizAttemptViewSet.submit_answer)
  - _to_bool_like is defined twice (views.py:103-114 and again at 1058-1064)
  - FormData building duplicated in api.js for questions

  19. Frontend Full Page Reload on Login

  File: Login.jsx:22
  window.location.href = '/';
  This destroys SPA benefits and shows a loading flash.

  20. No Input Sanitization for Review Text

  review_text accepts any content and is displayed directly. XSS risk if rendered without escaping.

  ---
  🟢 EFFICIENCY & PERFORMANCE ISSUES

  21. Over-Prefetching in get_queryset

  File: views.py:48-50
  base_qs = Quiz.objects.select_related('creator').prefetch_related(
      'questions', 'questions__media_files', 'translations'
  )
  Every list query loads ALL questions and media. For a quiz with 100 questions and 800 media files, this is brutal. Pagination helps but doesn't prevent the prefetch.

  22. Cyrillic Search Uses UPPER() on Every Row

  File: views.py:57-84
  This prevents index usage. Every search does a full table scan.

  23. No Caching Anywhere

  - No Redis/memcached
  - No @cache_page
  - No ETag headers
  - Rating summaries recalculated on every request

  24. Signals for Rating Updates

  File: models.py:615-623
  Signals run synchronously after every rating save, even bulk operations.

  25. Media Serving Through Django in Production

  File: geoquiz/urls.py
  Media should be served by nginx/CDN, not Django.

  ---
  🔵 USABILITY & CODE QUALITY

  26. No Tests

  backend/quizzes/tests.py and backend/users/tests.py are likely empty. No test coverage means you're deploying blind.

  27. No API Documentation

  No Swagger/OpenAPI. Frontend devs have to read the source.

  28. Error Messages Leak Implementation

  File: views.py:248
  return Response({"error": f"Failed to create question: {str(e)}"})
  Exception messages go directly to users. Could leak file paths, database errors, etc.

  29. Inconsistent Error Response Format

  Some endpoints return {"error": "..."}, others use {"detail": "..."}, others use DRF's field errors. The frontend has to handle all formats.

  30. No Form Validation Before Submission

  Frontend forms submit and then show errors. Should validate client-side first.

  31. Magic Numbers Throughout

  - MAX_FILES_PER_QUESTION = 8
  - MAX_FILES_PER_QUIZ = 100
  - page_size = 20
  - Thumbnail sizes scattered across models

  Should be in a central config.

  32. No Logging Infrastructure

  Using print() instead of Python's logging module. Can't filter by level, rotate logs, or send to aggregators.

  ---
  Summary Table
  ┌──────────────┬──────────┬──────┬────────┬─────┐
  │   Category   │ Critical │ High │ Medium │ Low │
  ├──────────────┼──────────┼──────┼────────┼─────┤
  │ Security     │ 7        │ 5    │ 4      │ -   │
  ├──────────────┼──────────┼──────┼────────┼─────┤
  │ Performance  │ -        │ -    │ 5      │ 3   │
  ├──────────────┼──────────┼──────┼────────┼─────┤
  │ Code Quality │ -        │ -    │ 3      │ 5   │
  └──────────────┴──────────┴──────┴────────┴─────┘
  ---
  Top 5 Actions (In Order)

  1. Move secrets to environment variables NOW
  2. Add rate limiting (django-ratelimit)
  3. Fix default permissions to IsAuthenticated
  4. Remove all print() statements, add proper logging
  5. Add tests before any further development

  Do you want me to start fixing any of these issues?