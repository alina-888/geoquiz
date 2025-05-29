import django_filters
from .models import Quiz, Question


class QuizFilter(django_filters.FilterSet):
    """Filter for Quiz objects"""
    category = django_filters.CharFilter(lookup_expr='iexact')
    creator = django_filters.NumberFilter(field_name='creator__id')
    difficulty_min = django_filters.NumberFilter(field_name='difficulty_level', lookup_expr='gte')
    difficulty_max = django_filters.NumberFilter(field_name='difficulty_level', lookup_expr='lte')
    rating_min = django_filters.NumberFilter(field_name='avg_rating', lookup_expr='gte')
    is_published = django_filters.BooleanFilter()
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Quiz
        fields = ['category', 'creator', 'difficulty_level', 'is_published']

