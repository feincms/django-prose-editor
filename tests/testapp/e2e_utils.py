import os

from django.contrib.auth.models import User
from playwright.sync_api import expect


os.environ.setdefault("DJANGO_ALLOW_ASYNC_UNSAFE", "true")


def login(page, live_server):
    User.objects.create_superuser("admin", "admin@example.com", "password")
    page.goto(f"{live_server.url}/admin/login/")
    page.fill("#id_username", "admin")
    page.fill("#id_password", "password")
    page.click("input[type=submit]")
    page.wait_for_url(f"{live_server.url}/admin/")


def save(page):
    """Submit the admin form and wait until the object has been saved."""
    page.click("input[name='_save']")
    expect(page.locator(".messagelist .success")).to_be_visible()
