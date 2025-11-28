from django.core.management.base import BaseCommand
from users.models import CustomUser


class Command(BaseCommand):
    help = 'Generate thumbnails for existing user profile pictures'

    def handle(self, *args, **options):
        users_with_pictures = CustomUser.objects.filter(
            profile_picture__isnull=False
        ).exclude(profile_picture='')

        total = users_with_pictures.count()
        self.stdout.write(f'Found {total} users with profile pictures')

        generated = 0
        skipped = 0
        errors = 0

        for user in users_with_pictures:
            try:
                # Check if thumbnail already exists
                if user.profile_thumbnail:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Skipping {user.username} - thumbnail already exists'
                        )
                    )
                    skipped += 1
                    continue

                # Generate thumbnail
                user._generate_thumbnail()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Generated thumbnail for {user.username}'
                    )
                )
                generated += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error generating thumbnail for {user.username}: {str(e)}'
                    )
                )
                errors += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\nComplete! Generated: {generated}, Skipped: {skipped}, Errors: {errors}'
            )
        )
