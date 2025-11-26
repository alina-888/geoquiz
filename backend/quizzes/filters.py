import django_filters
from django.db.models import Q
from .models import Quiz, Question


class QuizFilter(django_filters.FilterSet):
    """Filter for Quiz objects"""
    category = django_filters.CharFilter(lookup_expr='iexact')
    creator = django_filters.NumberFilter(field_name='creator__id')
    difficulty_min = django_filters.NumberFilter(field_name='difficulty_level', lookup_expr='gte')
    difficulty_max = django_filters.NumberFilter(field_name='difficulty_level', lookup_expr='lte')
    rating_min = django_filters.NumberFilter(field_name='avg_rating', lookup_expr='gte')
    is_published = django_filters.BooleanFilter()
    is_geo = django_filters.BooleanFilter()
    language = django_filters.CharFilter(method='filter_by_language')
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Quiz
        fields = ['category', 'creator', 'difficulty_level', 'is_published', 'is_geo']

    def filter_by_language(self, queryset, name, value):
        """Filter quizzes by default language OR translation availability"""
        if not value:
            return queryset
        return queryset.filter(
            Q(default_language__iexact=value) | Q(translations__language__iexact=value)
        ).distinct()

