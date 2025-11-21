
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from .media_views import serve_media

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('quizzes.urls')),
    path('api/users/', include('users.urls')),
]

if settings.DEBUG:

    import debug_toolbar
    # Use custom media view with Range request support for seeking
    urlpatterns += [
        path("__debug__/", include(debug_toolbar.urls)),
        re_path(r'^media/(?P<path>.*)$', serve_media, name='media'),
        
    ]

