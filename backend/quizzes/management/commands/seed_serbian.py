"""
Seed the database with curated Serbian-language quiz content.

- Deletes only quizzes that have zero questions (preserves non-empty existing
  quizzes and all users).
- Creates three new author users (marko, jelena, nikola) with a simple shared
  password if they do not already exist.
- Creates 7 quizzes about Serbia in Serbian (Cyrillic) with full translations
  to English and Russian, plus questions, options, hints and a few ratings.

Usage:
    python manage.py seed_serbian
"""
import random
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from quizzes.models import (
    Quiz, Question, Option, Hint, QuizRating,
    QuizTranslation, QuestionTranslation, OptionTranslation, HintTranslation,
)

User = get_user_model()

SEED_PASSWORD = "geoquiz123"

NEW_USERS = [
    {
        "username": "marko",
        "email": "marko@example.com",
        "bio": "Београђанин, водич кроз српске тврђаве и манастире.",
    },
    {
        "username": "jelena",
        "email": "jelena@example.com",
        "bio": "Љубитељ српске кухиње, фолклора и Новог Сада.",
    },
    {
        "username": "nikola",
        "email": "nikola@example.com",
        "bio": "Професор географије; пише квизове о природи и науци.",
    },
]


# Helper: returns option dict
def opt(sr, en, ru, correct=False):
    return {"sr": sr, "en": en, "ru": ru, "is_correct": correct}


# ------- Quiz definitions -------
# Each quiz is a dict with title/description in 3 langs and a list of questions.
# Each question has question_text/correct_answer in 3 langs, an optional
# geolocation (lat/lng/radius), question_type, points, and (for multiple_choice)
# a list of options. Some questions have hints.

QUIZZES = [
    # ============================================================
    # 1. Belgrade landmarks (geo)
    # ============================================================
    {
        "author": "marko",
        "category": "landmarks",
        "difficulty_level": 2,
        "estimated_duration": 12,
        "is_geo": True,
        "default_language": "sr",
        "title": {
            "sr": "Београд кроз знаменитости",
            "en": "Belgrade through its landmarks",
            "ru": "Белград через достопримечательности",
        },
        "description": {
            "sr": "Прошетајте престоницом Србије — од Калемегдана до Авале. Гео-квиз: одговарајте на питања на правим локацијама.",
            "en": "Walk through the capital of Serbia — from Kalemegdan to Avala. Geo-quiz: answer at the actual locations.",
            "ru": "Прогулка по столице Сербии — от Калемегдана до Авалы. Гео-квиз: отвечайте на вопросы на реальных местах.",
        },
        "questions": [
            {
                "type": "multiple_choice",
                "points": 10,
                "geo": {"lat": 44.8225, "lng": 20.4503, "radius": 200},
                "text": {
                    "sr": "На којем брду се налази тврђава Калемегдан?",
                    "en": "On which hill is Kalemegdan fortress located?",
                    "ru": "На каком холме расположена крепость Калемегдан?",
                },
                "options": [
                    opt("На ушћу Саве у Дунав", "At the confluence of the Sava and Danube",
                        "На месте слияния Савы и Дуная", correct=True),
                    opt("На обали Аде Циганлије", "On the bank of Ada Ciganlija",
                        "На берегу Ада Циганлия"),
                    opt("На Авали", "On Avala", "На Авале"),
                    opt("На Топчидерском брду", "On Topčider Hill", "На Топчидерском холме"),
                ],
                "hints": [
                    {
                        "penalty": 2,
                        "text": {
                            "sr": "Тврђава гледа на ушће две највеће реке.",
                            "en": "The fortress overlooks the confluence of two large rivers.",
                            "ru": "Крепость стоит над слиянием двух крупных рек.",
                        },
                    },
                ],
            },
            {
                "type": "multiple_choice",
                "points": 10,
                "geo": {"lat": 44.7975, "lng": 20.4684, "radius": 200},
                "text": {
                    "sr": "Који је највећи православни храм у Србији?",
                    "en": "Which is the largest Orthodox church in Serbia?",
                    "ru": "Какой православный храм самый большой в Сербии?",
                },
                "options": [
                    opt("Храм Светог Саве", "Church of Saint Sava", "Храм Святого Саввы", correct=True),
                    opt("Саборна црква", "Belgrade Cathedral", "Соборная церковь"),
                    opt("Црква Ружица", "Church of Ružica", "Церковь Ружица"),
                    opt("Манастир Раковица", "Rakovica Monastery", "Раковицкий монастырь"),
                ],
            },
            {
                "type": "text",
                "points": 15,
                "geo": {"lat": 44.8194, "lng": 20.4639, "radius": 200},
                "text": {
                    "sr": "Како се зове позната боемска четврт у центру Београда?",
                    "en": "What is the name of the famous bohemian quarter in central Belgrade?",
                    "ru": "Как называется знаменитый богемный квартал в центре Белграда?",
                },
                "answer": {"sr": "Скадарлија", "en": "Skadarlija", "ru": "Скадарлия"},
            },
            {
                "type": "true_false",
                "points": 5,
                "text": {
                    "sr": "Београд лежи на ушћу Саве у Дунав.",
                    "en": "Belgrade lies at the confluence of the Sava into the Danube.",
                    "ru": "Белград лежит у слияния Савы с Дунаем.",
                },
                "answer": {"sr": "true", "en": "true", "ru": "true"},
            },
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "Која торањ-знаменитост виси над Београдом са планине Авале?",
                    "en": "Which tower landmark rises over Belgrade from Mount Avala?",
                    "ru": "Какая башня-достопримечательность возвышается над Белградом с горы Авалы?",
                },
                "options": [
                    opt("Авалски торањ", "Avala Tower", "Авальская башня", correct=True),
                    opt("Геноекс торањ", "Genex Tower", "Башня Генекс"),
                    opt("Београђанка", "Beograđanka", "Београђанка"),
                    opt("Сахат-кула на Калемегдану", "Kalemegdan Clock Tower", "Часовая башня Калемегдана"),
                ],
            },
            {
                "type": "text",
                "points": 10,
                "text": {
                    "sr": "Која је најпознатија пешачка улица у Београду?",
                    "en": "What is the most famous pedestrian street in Belgrade?",
                    "ru": "Какая самая известная пешеходная улица Белграда?",
                },
                "answer": {
                    "sr": "Кнез Михаилова",
                    "en": "Knez Mihailova",
                    "ru": "Кнез Михайлова",
                },
            },
        ],
    },

    # ============================================================
    # 2. Medieval Serbian monasteries (geo)
    # ============================================================
    {
        "author": "marko",
        "category": "history",
        "difficulty_level": 3,
        "estimated_duration": 15,
        "is_geo": True,
        "default_language": "sr",
        "title": {
            "sr": "Манастири средњовековне Србије",
            "en": "Monasteries of medieval Serbia",
            "ru": "Монастыри средневековой Сербии",
        },
        "description": {
            "sr": "Од Студенице до Високих Дечана: упознајте задужбине Немањића и њихове светиње заштићене Унесковом листом.",
            "en": "From Studenica to Visoki Dečani — discover the Nemanjić endowments and UNESCO-listed sanctuaries.",
            "ru": "От Студеницы до Високих Дечан — задужбины Неманичей и святыни, охраняемые ЮНЕСКО.",
        },
        "questions": [
            {
                "type": "multiple_choice",
                "points": 10,
                "geo": {"lat": 43.4858, "lng": 20.5325, "radius": 500},
                "text": {
                    "sr": "Где се налази манастир Студеница, задужбина Стефана Немање?",
                    "en": "Where is Studenica Monastery, the endowment of Stefan Nemanja, located?",
                    "ru": "Где расположен монастырь Студеница, задужбина Стефана Немани?",
                },
                "options": [
                    opt("Близу Краљева, у долини Студенице", "Near Kraljevo, in the Studenica valley",
                        "Возле Кралева, в долине Студеницы", correct=True),
                    opt("На Косову, поред Призрена", "In Kosovo, near Prizren", "В Косово, возле Призрена"),
                    opt("На Фрушкој гори", "On Fruška Gora", "На Фрушке-Горе"),
                    opt("Близу Ниша", "Near Niš", "Возле Ниша"),
                ],
            },
            {
                "type": "text",
                "points": 15,
                "geo": {"lat": 42.6018, "lng": 21.1972, "radius": 500},
                "text": {
                    "sr": "Како се зове манастир — задужбина краља Милутина — на Косову, под заштитом Унеска?",
                    "en": "Name the UNESCO-protected monastery in Kosovo, the endowment of King Milutin.",
                    "ru": "Назовите монастырь в Косово под защитой ЮНЕСКО, задужбину короля Милутина.",
                },
                "answer": {"sr": "Грачаница", "en": "Gračanica", "ru": "Грачаница"},
                "hints": [
                    {
                        "penalty": 3,
                        "text": {
                            "sr": "Налази се у близини Приштине.",
                            "en": "It is located near Pristina.",
                            "ru": "Находится недалеко от Приштины.",
                        },
                    },
                ],
            },
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "Који је манастир био традиционално место крунисања српских краљева?",
                    "en": "Which monastery was traditionally the site of Serbian kings' coronations?",
                    "ru": "В каком монастыре по традиции короновали сербских королей?",
                },
                "options": [
                    opt("Жича", "Žiča", "Жича", correct=True),
                    opt("Манасија", "Manasija", "Манасия"),
                    opt("Раваница", "Ravanica", "Раваница"),
                    opt("Хиландар", "Hilandar", "Хиландар"),
                ],
            },
            {
                "type": "true_false",
                "points": 5,
                "text": {
                    "sr": "Манастир Хиландар на Светој гори (Атос) основали су Стефан Немања и Свети Сава.",
                    "en": "Hilandar Monastery on Mount Athos was founded by Stefan Nemanja and Saint Sava.",
                    "ru": "Монастырь Хиландар на Афоне основан Стефаном Неманей и Святым Саввой.",
                },
                "answer": {"sr": "true", "en": "true", "ru": "true"},
            },
            {
                "type": "multiple_choice",
                "points": 15,
                "text": {
                    "sr": "Који српски манастир је на Унесковом списку светске баштине у опасности?",
                    "en": "Which Serbian monastery is on the UNESCO list of World Heritage in Danger?",
                    "ru": "Какой сербский монастырь включён в список Всемирного наследия ЮНЕСКО под угрозой?",
                },
                "options": [
                    opt("Високи Дечани", "Visoki Dečani", "Высокие Дечани", correct=True),
                    opt("Студеница", "Studenica", "Студеница"),
                    opt("Манасија", "Manasija", "Манасия"),
                    opt("Жича", "Žiča", "Жича"),
                ],
                "hints": [
                    {
                        "penalty": 3,
                        "text": {
                            "sr": "Налази се у подножју Проклетија.",
                            "en": "It lies at the foot of the Prokletije mountains.",
                            "ru": "Расположен у подножия Проклетий.",
                        },
                    },
                ],
            },
            {
                "type": "text",
                "points": 10,
                "text": {
                    "sr": "Како се зове манастир познат по утврђењу са кулама и фрескама из 15. века, у близини Деспотовца?",
                    "en": "Name the monastery near Despotovac, famous for its towered fortifications and 15th-century frescoes.",
                    "ru": "Назовите монастырь возле Деспотовца, знаменитый укреплениями с башнями и фресками XV века.",
                },
                "answer": {"sr": "Манасија", "en": "Manasija", "ru": "Манасия"},
            },
        ],
    },

    # ============================================================
    # 3. Serbian cuisine (non-geo, beginner)
    # ============================================================
    {
        "author": "jelena",
        "category": "culture",
        "difficulty_level": 1,
        "estimated_duration": 8,
        "is_geo": False,
        "default_language": "sr",
        "title": {
            "sr": "Српска кухиња — почетнички водич",
            "en": "Serbian cuisine — a beginner's guide",
            "ru": "Сербская кухня — гид для начинающих",
        },
        "description": {
            "sr": "Сармa, ајвар, ракија, гибаница… Колико познајете класике српског стола?",
            "en": "Sarma, ajvar, rakija, gibanica… How well do you know the classics of the Serbian table?",
            "ru": "Сарма, айвар, ракия, гибаница… Насколько хорошо вы знаете классику сербского стола?",
        },
        "questions": [
            {
                "type": "multiple_choice",
                "points": 5,
                "text": {
                    "sr": "Шта је сарма?",
                    "en": "What is sarma?",
                    "ru": "Что такое сарма?",
                },
                "options": [
                    opt("Пуњени листови киселог купуса", "Stuffed sour cabbage leaves",
                        "Голубцы из квашеной капусты", correct=True),
                    opt("Слана пита са сиром", "Savoury cheese pie", "Солёный пирог с сыром"),
                    opt("Месна супа", "Meat soup", "Мясной суп"),
                    opt("Колач од ораха", "Walnut cake", "Ореховый торт"),
                ],
                "hints": [
                    {
                        "penalty": 1,
                        "text": {
                            "sr": "Прави се са киселим купусом и млевеним месом.",
                            "en": "Made with sour cabbage and minced meat.",
                            "ru": "Готовится из квашеной капусты и фарша.",
                        },
                    },
                ],
            },
            {
                "type": "multiple_choice",
                "points": 5,
                "text": {
                    "sr": "Шта је ајвар?",
                    "en": "What is ajvar?",
                    "ru": "Что такое айвар?",
                },
                "options": [
                    opt("Намаз од печене паприке", "A spread made from roasted peppers",
                        "Соус-намаз из запечённого перца", correct=True),
                    opt("Сос од белог лука", "Garlic sauce", "Чесночный соус"),
                    opt("Слаткиш од јабука", "Apple sweet", "Яблочное лакомство"),
                    opt("Сир из Златибора", "Cheese from Zlatibor", "Сыр из Златибора"),
                ],
            },
            {
                "type": "text",
                "points": 10,
                "text": {
                    "sr": "Како се зове позната српска ракија од шљива?",
                    "en": "What is the famous Serbian plum brandy called?",
                    "ru": "Как называется знаменитая сербская сливовая ракия?",
                },
                "answer": {"sr": "шљивовица", "en": "šljivovica", "ru": "сливовица"},
            },
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "Која традиционална слана пита има више слојева теста са сиром?",
                    "en": "Which traditional savoury pie has many layers of dough with cheese?",
                    "ru": "Какой традиционный солёный пирог состоит из многих слоёв теста с сыром?",
                },
                "options": [
                    opt("Гибаница", "Gibanica", "Гибаница", correct=True),
                    opt("Бурек", "Burek", "Бурек"),
                    opt("Проја", "Proja", "Проя"),
                    opt("Баклава", "Baklava", "Пахлава"),
                ],
            },
            {
                "type": "true_false",
                "points": 5,
                "text": {
                    "sr": "Кајмак је врста сланог млечног производа сличног павлаци.",
                    "en": "Kajmak is a type of salty dairy product similar to clotted cream.",
                    "ru": "Каймак — солёный молочный продукт, похожий на топлёные сливки.",
                },
                "answer": {"sr": "true", "en": "true", "ru": "true"},
            },
            {
                "type": "multiple_choice",
                "points": 5,
                "text": {
                    "sr": "Шта је чевапи?",
                    "en": "What is ćevapi?",
                    "ru": "Что такое чевапи?",
                },
                "options": [
                    opt("Ваљушци од млевеног меса на роштиљу", "Grilled minced-meat sausages",
                        "Гриль-колбаски из фарша", correct=True),
                    opt("Печена паприка", "Roasted pepper", "Печёный перец"),
                    opt("Кисело млеко", "Sour milk", "Кефир"),
                    opt("Пита са спанаћем", "Spinach pie", "Пирог со шпинатом"),
                ],
            },
        ],
    },

    # ============================================================
    # 4. Famous Serbs through the ages
    # ============================================================
    {
        "author": "nikola",
        "category": "history",
        "difficulty_level": 2,
        "estimated_duration": 10,
        "is_geo": False,
        "default_language": "sr",
        "title": {
            "sr": "Чувени Срби кроз векове",
            "en": "Famous Serbs through the centuries",
            "ru": "Знаменитые сербы сквозь века",
        },
        "description": {
            "sr": "Од средњовековних владара до научних великана 20. века — колико знате о Србима који су оставили траг у свету?",
            "en": "From medieval rulers to 20th-century scientific giants — how much do you know about Serbs who shaped the world?",
            "ru": "От средневековых правителей до научных гигантов XX века — что вы знаете о сербах, оставивших след в мире?",
        },
        "questions": [
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "Чиме се прославио Никола Тесла?",
                    "en": "What is Nikola Tesla famous for?",
                    "ru": "Чем знаменит Никола Тесла?",
                },
                "options": [
                    opt("Изумима у области наизменичне струје", "Inventions in alternating current",
                        "Изобретениями в области переменного тока", correct=True),
                    opt("Освајањем нових земаља", "Conquering new lands",
                        "Завоеванием новых земель"),
                    opt("Класичном музиком", "Classical music", "Классической музыкой"),
                    opt("Сликарством", "Painting", "Живописью"),
                ],
            },
            {
                "type": "text",
                "points": 15,
                "text": {
                    "sr": "Који српски писац је добио Нобелову награду за књижевност 1961. године?",
                    "en": "Which Serbian writer won the Nobel Prize in Literature in 1961?",
                    "ru": "Какой сербский писатель получил Нобелевскую премию по литературе в 1961 году?",
                },
                "answer": {"sr": "Иво Андрић", "en": "Ivo Andrić", "ru": "Иво Андрич"},
                "hints": [
                    {
                        "penalty": 3,
                        "text": {
                            "sr": "Његово најпознатије дело је „На Дрини ћуприја\".",
                            "en": "His best-known work is \"The Bridge on the Drina\".",
                            "ru": "Его самое известное произведение — «Мост на Дрине».",
                        },
                    },
                ],
            },
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "Чиме се прославио Михајло Пупин?",
                    "en": "What is Mihajlo Pupin famous for?",
                    "ru": "Чем известен Михайло Пупин?",
                },
                "options": [
                    opt("Изумима у телекомуникацијама", "Inventions in telecommunications",
                        "Изобретениями в области телекоммуникаций", correct=True),
                    opt("Открићима у астрономији", "Discoveries in astronomy", "Открытиями в астрономии"),
                    opt("Освајањем планина", "Mountaineering", "Альпинизмом"),
                    opt("Дипломатијом у 18. веку", "18th-century diplomacy", "Дипломатией XVIII века"),
                ],
            },
            {
                "type": "true_false",
                "points": 5,
                "text": {
                    "sr": "Душан Силни је био српски цар у 14. веку.",
                    "en": "Dušan the Mighty was a Serbian emperor in the 14th century.",
                    "ru": "Душан Сильный был сербским царём в XIV веке.",
                },
                "answer": {"sr": "true", "en": "true", "ru": "true"},
            },
            {
                "type": "text",
                "points": 15,
                "text": {
                    "sr": "Који српски научник је дао математичку теорију климатских циклуса?",
                    "en": "Which Serbian scientist gave the mathematical theory of climate cycles?",
                    "ru": "Какой сербский учёный создал математическую теорию климатических циклов?",
                },
                "answer": {
                    "sr": "Милутин Миланковић",
                    "en": "Milutin Milanković",
                    "ru": "Милутин Миланкович",
                },
                "hints": [
                    {
                        "penalty": 3,
                        "text": {
                            "sr": "Његова теорија објашњава смену ледених доба.",
                            "en": "His theory explains the alternation of ice ages.",
                            "ru": "Его теория объясняет смену ледниковых периодов.",
                        },
                    },
                ],
            },
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "Који је био први српски кнез у обновљеној Србији 19. века?",
                    "en": "Who was the first Serbian prince of the restored 19th-century Serbia?",
                    "ru": "Кто был первым сербским князем восстановленной Сербии XIX века?",
                },
                "options": [
                    opt("Милош Обреновић", "Miloš Obrenović", "Милош Обренович", correct=True),
                    opt("Карађорђе Петровић", "Karađorđe Petrović", "Карагеоргий Петрович"),
                    opt("Александар Карађорђевић", "Aleksandar Karađorđević", "Александр Карагеоргиевич"),
                    opt("Михаило Обреновић", "Mihailo Obrenović", "Михайло Обренович"),
                ],
            },
        ],
    },

    # ============================================================
    # 5. Nature and national parks of Serbia (non-geo)
    # ============================================================
    {
        "author": "nikola",
        "category": "nature",
        "difficulty_level": 1,
        "estimated_duration": 10,
        "is_geo": False,
        "default_language": "sr",
        "title": {
            "sr": "Природа Србије: национални паркови и реке",
            "en": "Nature of Serbia: national parks and rivers",
            "ru": "Природа Сербии: национальные парки и реки",
        },
        "description": {
            "sr": "Тара, Ђердап, Копаоник, Увац — пет националних паркова и стотине река. Колико познајете природне знаменитости?",
            "en": "Tara, Đerdap, Kopaonik, Uvac — five national parks and hundreds of rivers. How well do you know Serbia's natural treasures?",
            "ru": "Тара, Джердап, Копаоник, Увац — пять национальных парков и сотни рек. Насколько хорошо вы знаете природу Сербии?",
        },
        "questions": [
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "Који је највећи национални парк у Србији по површини?",
                    "en": "Which is the largest national park in Serbia by area?",
                    "ru": "Какой национальный парк Сербии самый большой по площади?",
                },
                "options": [
                    opt("Ђердап", "Đerdap", "Джердап", correct=True),
                    opt("Тара", "Tara", "Тара"),
                    opt("Копаоник", "Kopaonik", "Копаоник"),
                    opt("Фрушка гора", "Fruška Gora", "Фрушка-Гора"),
                ],
            },
            {
                "type": "text",
                "points": 15,
                "text": {
                    "sr": "Која река чини део границе између Србије и Румуније?",
                    "en": "Which river forms part of the border between Serbia and Romania?",
                    "ru": "Какая река образует часть границы между Сербией и Румынией?",
                },
                "answer": {"sr": "Дунав", "en": "Danube", "ru": "Дунай"},
            },
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "Која је најдужа река која у потпуности тече кроз Србију?",
                    "en": "Which is the longest river flowing entirely through Serbia?",
                    "ru": "Какая самая длинная река, протекающая исключительно по территории Сербии?",
                },
                "options": [
                    opt("Велика Морава", "Velika Morava", "Великая Морава", correct=True),
                    opt("Тара", "Tara", "Тара"),
                    opt("Тимок", "Timok", "Тимок"),
                    opt("Ибар", "Ibar", "Ибар"),
                ],
            },
            {
                "type": "true_false",
                "points": 5,
                "text": {
                    "sr": "Резерват Увац познат је по белоглавим суповима.",
                    "en": "The Uvac reserve is known for its griffon vultures.",
                    "ru": "Заповедник Увац известен белоголовыми сипами.",
                },
                "answer": {"sr": "true", "en": "true", "ru": "true"},
            },
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "Која планина има највиши врх на територији коју Србија сматра својом?",
                    "en": "Which mountain has the highest peak in the territory Serbia considers its own?",
                    "ru": "Какая гора имеет наивысшую вершину на территории, которую Сербия считает своей?",
                },
                "options": [
                    opt("Проклетије (Ђеравица)", "Prokletije (Đeravica)", "Проклетие (Деравица)", correct=True),
                    opt("Копаоник (Панчићев врх)", "Kopaonik (Pančić Peak)", "Копаоник (вершина Панчича)"),
                    opt("Стара планина (Миџор)", "Stara Planina (Midžor)", "Стара-Планина (Миджор)"),
                    opt("Тара (Збориште)", "Tara (Zborište)", "Тара (Збориште)"),
                ],
                "hints": [
                    {
                        "penalty": 2,
                        "text": {
                            "sr": "Налази се на југозападу, на граници ка Албанији.",
                            "en": "It lies in the southwest, near the Albanian border.",
                            "ru": "Находится на юго-западе, на границе с Албанией.",
                        },
                    },
                ],
            },
            {
                "type": "text",
                "points": 10,
                "text": {
                    "sr": "Како се зове кањон Дунава у источној Србији, између Карпата и Балкана?",
                    "en": "Name the Danube canyon in eastern Serbia between the Carpathians and the Balkans.",
                    "ru": "Назовите каньон Дуная в восточной Сербии между Карпатами и Балканами.",
                },
                "answer": {
                    "sr": "Ђердапска клисура",
                    "en": "Đerdap Gorge",
                    "ru": "Джердапское ущелье",
                },
            },
        ],
    },

    # ============================================================
    # 6. Novi Sad (geo)
    # ============================================================
    {
        "author": "jelena",
        "category": "landmarks",
        "difficulty_level": 1,
        "estimated_duration": 10,
        "is_geo": True,
        "default_language": "sr",
        "title": {
            "sr": "Нови Сад: Атина Србије",
            "en": "Novi Sad: the Athens of Serbia",
            "ru": "Нови-Сад: «сербские Афины»",
        },
        "description": {
            "sr": "Од Петроварадинске тврђаве до Змај Јовине улице — гео-квиз кроз срце Војводине.",
            "en": "From Petrovaradin Fortress to Zmaj Jovina Street — a geo-quiz through the heart of Vojvodina.",
            "ru": "От Петроварадинской крепости до улицы Змай-Йовиной — гео-квиз по сердцу Воеводины.",
        },
        "questions": [
            {
                "type": "multiple_choice",
                "points": 10,
                "geo": {"lat": 45.2519, "lng": 19.8633, "radius": 300},
                "text": {
                    "sr": "Како се зове велика тврђава изнад Дунава у Новом Саду?",
                    "en": "What is the name of the large fortress above the Danube in Novi Sad?",
                    "ru": "Как называется большая крепость над Дунаем в Нови-Саде?",
                },
                "options": [
                    opt("Петроварадинска тврђава", "Petrovaradin Fortress", "Петроварадинская крепость", correct=True),
                    opt("Калемегдан", "Kalemegdan", "Калемегдан"),
                    opt("Голубачка тврђава", "Golubac Fortress", "Голубацкая крепость"),
                    opt("Смедеревска тврђава", "Smederevo Fortress", "Смедеревская крепость"),
                ],
            },
            {
                "type": "text",
                "points": 15,
                "geo": {"lat": 45.2519, "lng": 19.8633, "radius": 300},
                "text": {
                    "sr": "Који музички фестивал се сваког лета одржава на Петроварадинској тврђави?",
                    "en": "Which music festival is held every summer at Petrovaradin Fortress?",
                    "ru": "Какой музыкальный фестиваль ежегодно проводится в Петроварадинской крепости?",
                },
                "answer": {"sr": "EXIT", "en": "EXIT", "ru": "EXIT"},
            },
            {
                "type": "multiple_choice",
                "points": 10,
                "geo": {"lat": 45.2554, "lng": 19.8453, "radius": 300},
                "text": {
                    "sr": "Која је главна пешачка улица у центру Новог Сада?",
                    "en": "Which is the main pedestrian street in the centre of Novi Sad?",
                    "ru": "Какая главная пешеходная улица в центре Нови-Сада?",
                },
                "options": [
                    opt("Змај Јовина улица", "Zmaj Jovina Street", "Улица Змай-Йовина", correct=True),
                    opt("Кнез Михаилова", "Knez Mihailova", "Кнез Михайлова"),
                    opt("Дунавска улица", "Dunavska Street", "Дунайская улица"),
                    opt("Бранкова улица", "Brankova Street", "Бранкова улица"),
                ],
            },
            {
                "type": "true_false",
                "points": 5,
                "text": {
                    "sr": "Нови Сад је био Европска престоница културе 2022. године.",
                    "en": "Novi Sad was the European Capital of Culture in 2022.",
                    "ru": "Нови-Сад был культурной столицей Европы в 2022 году.",
                },
                "answer": {"sr": "true", "en": "true", "ru": "true"},
            },
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "На којој реци лежи Нови Сад?",
                    "en": "Which river does Novi Sad lie on?",
                    "ru": "На какой реке стоит Нови-Сад?",
                },
                "options": [
                    opt("Дунав", "Danube", "Дунай", correct=True),
                    opt("Сава", "Sava", "Сава"),
                    opt("Тиса", "Tisa", "Тиса"),
                    opt("Велика Морава", "Velika Morava", "Великая Морава"),
                ],
            },
        ],
    },

    # ============================================================
    # 7. Serbian language and Cyrillic
    # ============================================================
    {
        "author": "nikola",
        "category": "culture",
        "difficulty_level": 2,
        "estimated_duration": 8,
        "is_geo": False,
        "default_language": "sr",
        "title": {
            "sr": "Српски језик и ћирилица",
            "en": "Serbian language and Cyrillic script",
            "ru": "Сербский язык и кириллица",
        },
        "description": {
            "sr": "О реформи Вука Караџића, два писма и правилу „Пиши као што говориш\".",
            "en": "About Vuk Karadžić's reform, two scripts and the rule \"Write as you speak\".",
            "ru": "О реформе Вука Караджича, двух алфавитах и правиле «Пиши как говоришь».",
        },
        "questions": [
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "Ко је реформисао српски језик и азбуку у 19. веку?",
                    "en": "Who reformed the Serbian language and alphabet in the 19th century?",
                    "ru": "Кто реформировал сербский язык и азбуку в XIX веке?",
                },
                "options": [
                    opt("Вук Стефановић Караџић", "Vuk Stefanović Karadžić", "Вук Стефанович Караджич", correct=True),
                    opt("Доситеј Обрадовић", "Dositej Obradović", "Доситей Обрадович"),
                    opt("Свети Сава", "Saint Sava", "Святой Савва"),
                    opt("Јован Скерлић", "Jovan Skerlić", "Йован Скерлич"),
                ],
            },
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "Колико слова има српска ћирилица?",
                    "en": "How many letters does the Serbian Cyrillic alphabet have?",
                    "ru": "Сколько букв в сербской кириллице?",
                },
                "options": [
                    opt("30", "30", "30", correct=True),
                    opt("26", "26", "26"),
                    opt("32", "32", "32"),
                    opt("33", "33", "33"),
                ],
            },
            {
                "type": "true_false",
                "points": 5,
                "text": {
                    "sr": "Правило „Пиши као што говориш, читај као што је написано\" приписује се Вуку Караџићу.",
                    "en": "The rule \"Write as you speak, read as it is written\" is attributed to Vuk Karadžić.",
                    "ru": "Правило «Пиши как говоришь, читай как написано» приписывается Вуку Караджичу.",
                },
                "answer": {"sr": "true", "en": "true", "ru": "true"},
            },
            {
                "type": "text",
                "points": 10,
                "text": {
                    "sr": "Која два писма се службено користе у савременом српском језику?",
                    "en": "Which two scripts are officially used in modern Serbian?",
                    "ru": "Какие два алфавита официально используются в современном сербском языке?",
                },
                "answer": {
                    "sr": "ћирилица и латиница",
                    "en": "Cyrillic and Latin",
                    "ru": "кириллица и латиница",
                },
                "hints": [
                    {
                        "penalty": 2,
                        "text": {
                            "sr": "Једно је словенско, друго је латинско.",
                            "en": "One is Slavic, the other is Latin.",
                            "ru": "Один — славянский, другой — латинский.",
                        },
                    },
                ],
            },
            {
                "type": "multiple_choice",
                "points": 10,
                "text": {
                    "sr": "Када је објављен први „Српски рјечник\" Вука Караџића?",
                    "en": "When was Vuk Karadžić's first \"Serbian Dictionary\" published?",
                    "ru": "Когда был издан первый «Сербский словарь» Вука Караджича?",
                },
                "options": [
                    opt("1818. године", "In 1818", "В 1818 году", correct=True),
                    opt("1750. године", "In 1750", "В 1750 году"),
                    opt("1878. године", "In 1878", "В 1878 году"),
                    opt("1903. године", "In 1903", "В 1903 году"),
                ],
            },
        ],
    },
]


# Reviews to attach (rater_username, quiz_index, rating, optional review_text-sr)
RATINGS = [
    ("alina", 0, 5, "Сјајан квиз, шетао сам са њим по Београду! Препоручујем."),
    ("nika", 0, 4, "Лепе локације, нека питања су ми била теже него што сам очекивала."),
    ("miron", 1, 5, "Манастири су чудо. Квиз је урадио добру селекцију."),
    ("alina", 2, 5, "Огладнела сам док сам решавала :)"),
    ("Bojana", 2, 4, None),
    ("nika", 3, 4, "Лепо постављена питања, могло би и више о женама у науци."),
    ("alina", 4, 5, "Учила сам нешто ново, добра природа Србије!"),
    ("miron", 5, 5, "Нови Сад је најбољи град. Квиз ме оживео."),
    ("Bojana", 6, 5, "Свака част за Вука!"),
]


class Command(BaseCommand):
    help = "Seed Serbian-language quizzes with translations, hints and ratings."

    @transaction.atomic
    def handle(self, *args, **options):
        # Step 1: delete only empty quizzes
        empty = Quiz.objects.filter(questions__isnull=True)
        empty_count = empty.count()
        empty_titles = list(empty.values_list("id", "title"))
        empty.delete()
        self.stdout.write(self.style.WARNING(
            f"Deleted {empty_count} empty quiz(zes): {empty_titles}"
        ))

        # Step 2: create new author users (idempotent)
        author_objs = {}
        for u in NEW_USERS:
            user, created = User.objects.get_or_create(
                username=u["username"],
                defaults={"email": u["email"], "bio": u["bio"]},
            )
            if created:
                user.set_password(SEED_PASSWORD)
                user.save()
                self.stdout.write(self.style.SUCCESS(
                    f"Created user '{user.username}' (password: {SEED_PASSWORD})"
                ))
            else:
                self.stdout.write(f"User '{user.username}' already exists; reusing.")
            author_objs[u["username"]] = user

        # Step 3: create quizzes
        rater_pool = {u.username: u for u in User.objects.exclude(
            username__in=[u["username"] for u in NEW_USERS]
        )}

        created_quizzes = []
        for qd in QUIZZES:
            author = author_objs[qd["author"]]
            quiz = Quiz.objects.create(
                creator=author,
                title=qd["title"]["sr"],
                description=qd["description"]["sr"],
                difficulty_level=qd["difficulty_level"],
                estimated_duration=qd["estimated_duration"],
                category=qd["category"],
                is_published=True,
                is_geo=qd["is_geo"],
                default_language=qd["default_language"],
            )
            created_quizzes.append(quiz)

            # Quiz translations: en, ru (sr is the default already on the model)
            for lang in ("en", "ru"):
                QuizTranslation.objects.create(
                    quiz=quiz,
                    language=lang,
                    title=qd["title"][lang],
                    description=qd["description"][lang],
                )

            # Questions
            for q_idx, qd_q in enumerate(qd["questions"], start=1):
                q_kwargs = dict(
                    quiz=quiz,
                    question_text=qd_q["text"]["sr"],
                    question_order=q_idx,
                    points_value=qd_q["points"],
                    question_type=qd_q["type"],
                )
                if qd_q.get("geo"):
                    q_kwargs["geolocation"] = qd_q["geo"]
                if qd_q["type"] in ("text", "true_false"):
                    q_kwargs["correct_answer"] = qd_q["answer"]["sr"]

                question = Question.objects.create(**q_kwargs)

                for lang in ("en", "ru"):
                    qt_kwargs = dict(
                        question=question,
                        language=lang,
                        question_text=qd_q["text"][lang],
                    )
                    if qd_q["type"] in ("text", "true_false"):
                        qt_kwargs["correct_answer"] = qd_q["answer"][lang]
                    QuestionTranslation.objects.create(**qt_kwargs)

                # Options for multiple choice
                if qd_q["type"] == "multiple_choice":
                    for opt_idx, o in enumerate(qd_q["options"], start=1):
                        option = Option.objects.create(
                            question=question,
                            option_text=o["sr"],
                            is_correct=o["is_correct"],
                            option_order=opt_idx,
                        )
                        for lang in ("en", "ru"):
                            OptionTranslation.objects.create(
                                option=option,
                                language=lang,
                                option_text=o[lang],
                            )

                # Hints
                for h_idx, h in enumerate(qd_q.get("hints", []), start=1):
                    hint = Hint.objects.create(
                        question=question,
                        hint_text=h["text"]["sr"],
                        points_penalty=h["penalty"],
                        hint_order=h_idx,
                    )
                    for lang in ("en", "ru"):
                        HintTranslation.objects.create(
                            hint=hint,
                            language=lang,
                            hint_text=h["text"][lang],
                        )

            self.stdout.write(self.style.SUCCESS(
                f"Created quiz '{quiz.title}' (id={quiz.id}, author={author.username}) "
                f"with {len(qd['questions'])} questions"
            ))

        # Step 4: ratings (signals will recompute avg_rating automatically)
        rating_count = 0
        for rater_username, quiz_idx, rating, review in RATINGS:
            rater = rater_pool.get(rater_username)
            if not rater or quiz_idx >= len(created_quizzes):
                continue
            QuizRating.objects.create(
                quiz=created_quizzes[quiz_idx],
                user=rater,
                rating=rating,
                review_text=review,
            )
            rating_count += 1
        self.stdout.write(self.style.SUCCESS(f"Created {rating_count} ratings."))

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. {len(created_quizzes)} new Serbian quizzes available. "
            f"Login with any of: marko / jelena / nikola, password: {SEED_PASSWORD}"
        ))
