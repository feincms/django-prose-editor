from django import test
from django.contrib.auth.models import User
from django.test import Client

from django_prose_editor.widgets import prose_editor_admin_media, prose_editor_media
from testapp.models import (
    ProseEditorModel,
    SanitizedProseEditorModel,
)


class Test(test.TestCase):
    def test_standard_field(self):
        m = ProseEditorModel(description="<p></p>")
        m.full_clean()
        assert m.description == ""

        m = ProseEditorModel(description="<h1></h1>")
        m.full_clean()
        assert m.description == ""

        m = ProseEditorModel(description="<p>hello</p>")
        m.full_clean()
        assert m.description == "<p>hello</p>"

    def test_sanitized_field(self):
        m = SanitizedProseEditorModel(
            description="<style>h1{color:red}</style><h1>Hello</h1>"
        )
        m.full_clean()
        assert m.description == "<h1>Hello</h1>"

        m = SanitizedProseEditorModel(description="<p></p>")
        m.full_clean()
        assert m.description == ""

        m = SanitizedProseEditorModel(description="<h1></h1>")
        m.full_clean()
        assert m.description == ""

        m = SanitizedProseEditorModel(description="<p>hello</p>")
        m.full_clean()
        assert m.description == "<p>hello</p>"

    def test_admin(self):
        client = Client()
        client.force_login(
            User.objects.create_superuser("admin", "admin@example.com", "password")
        )

        response = client.get("/admin/testapp/proseeditormodel/add/")
        # print(response, response.content.decode("utf-8"))
        self.assertContains(
            response, 'href="/static/django_prose_editor/overrides.css"'
        )

    def test_utilities(self):
        assert (
            str(prose_editor_media())
            == """\
<link href="/static/django_prose_editor/material-icons.css" media="all" rel="stylesheet">
<link href="/static/django_prose_editor/editor.css" media="all" rel="stylesheet">
<script src="/static/django_prose_editor/editor.js" type="module"></script>
<script src="/static/django_prose_editor/default.js" type="module"></script>"""
        )

        assert (
            str(prose_editor_media(preset="configurable"))
            == """\
<link href="/static/django_prose_editor/material-icons.css" media="all" rel="stylesheet">
<link href="/static/django_prose_editor/editor.css" media="all" rel="stylesheet">
<script src="/static/django_prose_editor/editor.js" type="module"></script>
<script src="/static/django_prose_editor/configurable.js" type="module"></script>"""
        )

        assert (
            str(prose_editor_media(base=prose_editor_admin_media))
            == """\
<link href="/static/django_prose_editor/material-icons.css" media="all" rel="stylesheet">
<link href="/static/django_prose_editor/editor.css" media="all" rel="stylesheet">
<link href="/static/django_prose_editor/overrides.css" media="all" rel="stylesheet">
<script src="/static/django_prose_editor/editor.js" type="module"></script>
<script src="/static/django_prose_editor/default.js" type="module"></script>"""
        )
