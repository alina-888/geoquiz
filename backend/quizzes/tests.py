"""Tests for the geo-question answer enforcement at the API layer."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from quizzes.models import Option, Question, Quiz, UserAnswer

User = get_user_model()

# Calemegdan, Belgrade
TARGET_LAT = 44.8225
TARGET_LNG = 20.4503
TARGET_RADIUS_M = 200

# Moscow — comfortably outside any 200m radius around Belgrade
FAR_LAT = 55.7558
FAR_LNG = 37.6176


class GeoAnswerEnforcementTests(TestCase):
    """
    The answer endpoint at /api/quizzes/<id>/question/<qid>/answer/ must
    refuse out-of-range submissions for geo-questions, with bypasses for
    the quiz creator and for superusers.
    """

    @classmethod
    def setUpTestData(cls):
        cls.creator = User.objects.create_user(
            username="creator", email="creator@example.com", password="x"
        )
        cls.player = User.objects.create_user(
            username="player", email="player@example.com", password="x"
        )
        cls.admin = User.objects.create_user(
            username="admin", email="admin@example.com", password="x", is_superuser=True
        )

        # A geo quiz with one multiple-choice geo-question and one text geo-question
        cls.quiz = Quiz.objects.create(
            creator=cls.creator,
            title="Beograd",
            description="...",
            estimated_duration=10,
            is_geo=True,
            is_published=True,
            default_language="sr",
        )
        cls.geo_mc = Question.objects.create(
            quiz=cls.quiz,
            question_text="Где је Калемегдан?",
            question_order=1,
            points_value=10,
            question_type="multiple_choice",
            geolocation={"lat": TARGET_LAT, "lng": TARGET_LNG, "radius": TARGET_RADIUS_M},
        )
        cls.correct_option = Option.objects.create(
            question=cls.geo_mc, option_text="Београд", is_correct=True, option_order=1
        )
        Option.objects.create(
            question=cls.geo_mc, option_text="Ниш", is_correct=False, option_order=2
        )

        cls.geo_text = Question.objects.create(
            quiz=cls.quiz,
            question_text="Како се зове...",
            question_order=2,
            points_value=10,
            question_type="text",
            correct_answer="Скадарлија",
            geolocation={"lat": TARGET_LAT, "lng": TARGET_LNG, "radius": TARGET_RADIUS_M},
        )

        # A second, non-geo quiz with a non-geo question
        cls.plain_quiz = Quiz.objects.create(
            creator=cls.creator,
            title="Trivia",
            description="...",
            estimated_duration=5,
            is_geo=False,
            is_published=True,
            default_language="sr",
        )
        cls.plain_q = Question.objects.create(
            quiz=cls.plain_quiz,
            question_text="2+2?",
            question_order=1,
            points_value=5,
            question_type="multiple_choice",
        )
        cls.plain_correct = Option.objects.create(
            question=cls.plain_q, option_text="4", is_correct=True, option_order=1
        )
        Option.objects.create(
            question=cls.plain_q, option_text="5", is_correct=False, option_order=2
        )

    def setUp(self):
        self.client = APIClient()

    def _answer_url(self, quiz, question):
        return f"/api/quizzes/{quiz.id}/question/{question.id}/answer/"

    def _post(self, user, quiz, question, payload):
        self.client.force_authenticate(user=user)
        return self.client.post(
            self._answer_url(quiz, question),
            payload,
            format="json",
            HTTP_HOST="localhost",
        )

    # ---------- enforcement ----------

    def test_missing_coords_on_geo_question_returns_400(self):
        r = self._post(self.player, self.quiz, self.geo_mc, {"option": self.correct_option.id})
        self.assertEqual(r.status_code, 400)
        self.assertIn("location", r.data["error"].lower())

    def test_out_of_range_returns_403_with_distance(self):
        r = self._post(
            self.player, self.quiz, self.geo_mc,
            {"option": self.correct_option.id, "lat": FAR_LAT, "lng": FAR_LNG},
        )
        self.assertEqual(r.status_code, 403)
        self.assertGreater(r.data["distance_m"], TARGET_RADIUS_M)
        self.assertEqual(r.data["radius_m"], TARGET_RADIUS_M)
        # The answer must NOT have been recorded.
        self.assertFalse(
            UserAnswer.objects.filter(attempt__user=self.player, question=self.geo_mc).exists()
        )

    def test_in_range_records_answer(self):
        r = self._post(
            self.player, self.quiz, self.geo_mc,
            {"option": self.correct_option.id, "lat": TARGET_LAT, "lng": TARGET_LNG},
        )
        self.assertEqual(r.status_code, 200)
        ua = UserAnswer.objects.get(attempt__user=self.player, question=self.geo_mc)
        self.assertTrue(ua.is_correct)
        self.assertEqual(ua.points_earned, self.geo_mc.points_value)

    def test_text_geo_question_also_enforced(self):
        # Even with the correct text answer, out-of-range must fail.
        r = self._post(
            self.player, self.quiz, self.geo_text,
            {"text": "Скадарлија", "lat": FAR_LAT, "lng": FAR_LNG},
        )
        self.assertEqual(r.status_code, 403)
        self.assertFalse(
            UserAnswer.objects.filter(attempt__user=self.player, question=self.geo_text).exists()
        )

    # ---------- bypasses ----------

    def test_creator_bypass_from_anywhere(self):
        r = self._post(
            self.creator, self.quiz, self.geo_mc,
            {"option": self.correct_option.id, "lat": FAR_LAT, "lng": FAR_LNG},
        )
        self.assertEqual(r.status_code, 200)

    def test_creator_bypass_without_coords(self):
        # Creator should not even need to send coordinates.
        r = self._post(self.creator, self.quiz, self.geo_mc, {"option": self.correct_option.id})
        self.assertEqual(r.status_code, 200)

    def test_superuser_bypass_from_anywhere(self):
        r = self._post(
            self.admin, self.quiz, self.geo_mc,
            {"option": self.correct_option.id, "lat": FAR_LAT, "lng": FAR_LNG},
        )
        self.assertEqual(r.status_code, 200)

    # ---------- non-geo passthrough ----------

    def test_non_geo_question_does_not_require_coords(self):
        r = self._post(
            self.player, self.plain_quiz, self.plain_q,
            {"option": self.plain_correct.id},
        )
        self.assertEqual(r.status_code, 200)

    # ---------- haversine sanity ----------

    def test_haversine_distance_matches_known_value(self):
        # Belgrade ↔ Moscow ≈ 1713 km. Allow ±5 km tolerance.
        from quizzes.views import QuizViewSet
        d = QuizViewSet._haversine_distance(TARGET_LAT, TARGET_LNG, FAR_LAT, FAR_LNG)
        self.assertAlmostEqual(d / 1000, 1713, delta=5)
