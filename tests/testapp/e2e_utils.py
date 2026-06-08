import os

from django.contrib.auth.models import User


os.environ.setdefault("DJANGO_ALLOW_ASYNC_UNSAFE", "true")


def login(page, live_server):
    User.objects.create_superuser("admin", "admin@example.com", "password")
    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")
