import os
import tempfile

from js_asset import static_lazy

from django_prose_editor.config import html_tags


# Use a file-based database: with an in-memory database, the live server
# shares a single connection across all its request threads and the test
# thread, which causes random InterfaceErrors and even segfaults. NAME itself
# must not be ":memory:" either, because pytest-django decides whether to share
# the connection before the test database is set up.
_DB_PATH = os.path.join(
    tempfile.gettempdir(), f"django-prose-editor-test-{os.getpid()}.sqlite3"
)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": _DB_PATH,
        "TEST": {"NAME": _DB_PATH},
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.admin",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    "django.contrib.messages",
    "django_prose_editor",
    "cabinet",
    "testapp",
]

MEDIA_ROOT = "/media/"
STATIC_URL = "/static/"
BASEDIR = os.path.dirname(__file__)
MEDIA_ROOT = os.path.join(BASEDIR, "media/")
STATIC_ROOT = os.path.join(BASEDIR, "static/")
SECRET_KEY = "supersikret"
LOGIN_REDIRECT_URL = "/?login=1"
ALLOWED_HOSTS = ["*"]

ROOT_URLCONF = "testapp.urls"
LANGUAGES = (("en", "English"), ("de", "German"))

# No custom presets needed anymore
DJANGO_PROSE_EDITOR_PRESETS = {}

DJANGO_PROSE_EDITOR_EXTENSIONS = [
    {
        "js": [static_lazy("testapp/blue-bold.js")],
        "extensions": {
            "BlueBold": html_tags(
                tags=["strong"], attributes={"strong": ["style", "class"]}
            )
        },
    },
]


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
