from django.apps import AppConfig
from django.db.backends.signals import connection_created
from django.dispatch import receiver

class QuizzesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'quizzes'

    def ready(self):
        # Connect the signal when the app starts
        # We don't need to import anything else here, just having the method is enough
        pass

# this is a workaround to fix the issue with SQLite's native UPPER/LOWER functions not supporting Cyrillic case-insensitivity
# TODO: remove this once we switch to a different database
@receiver(connection_created)
def extend_sqlite_functions(sender, connection, **kwargs):
    """
    Overwrites SQLite's native UPPER/LOWER functions with Python's
    implementation to support Cyrillic case-insensitivity.
    """
    if connection.vendor == 'sqlite':
        cursor = connection.cursor()
        # These 3 lines fix the issue:
        connection.connection.create_function("UPPER", 1, lambda s: s.upper() if s else s)
        connection.connection.create_function("LOWER", 1, lambda s: s.lower() if s else s)