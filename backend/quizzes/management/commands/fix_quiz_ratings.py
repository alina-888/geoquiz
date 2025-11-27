from django.core.management.base import BaseCommand
from django.db.models import Avg
from quizzes.models import Quiz


class Command(BaseCommand):
    help = 'Recalculate and fix all quiz ratings based on current QuizRating records'

    def handle(self, *args, **options):
        self.stdout.write('Recalculating quiz ratings...')

        quizzes = Quiz.objects.all()
        fixed_count = 0

        for quiz in quizzes:
            old_avg = quiz.avg_rating
            old_total = quiz.total_ratings

            # Recalculate from actual ratings
            ratings = quiz.ratings.all()
            total = ratings.count()

            if total > 0:
                avg = ratings.aggregate(Avg('rating'))['rating__avg']
                quiz.avg_rating = round(avg, 2)
                quiz.total_ratings = total
            else:
                quiz.avg_rating = 0.0
                quiz.total_ratings = 0

            if quiz.avg_rating != old_avg or quiz.total_ratings != old_total:
                quiz.save(update_fields=['avg_rating', 'total_ratings'])
                fixed_count += 1
                self.stdout.write(
                    f'  Fixed "{quiz.title}": {old_avg}/{old_total} -> {quiz.avg_rating}/{quiz.total_ratings}'
                )

        self.stdout.write(
            self.style.SUCCESS(f'\nSuccessfully fixed {fixed_count} quiz(zes) out of {quizzes.count()} total')
        )
