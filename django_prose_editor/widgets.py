import json

from django import forms
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from js_asset import JS, importmap, static_lazy

from django_prose_editor.config import (
    expand_extensions,
    js_from_extensions,
)


importmap.update(
    {
        "imports": {
            "django-prose-editor/editor": static_lazy("django_prose_editor/editor.js"),
            "django-prose-editor/configurable": static_lazy(
                "django_prose_editor/configurable.js"
            ),
        }
    }
)

#: These three module-level variables are somewhat part of the API.
prose_editor_js = JS("django_prose_editor/editor.js", {"type": "module"})
prose_editor_base_media = forms.Media(
    css={
        "all": [
            "django_prose_editor/material-icons.css",
            "django_prose_editor/editor.css",
        ]
    },
    js=[
        # We don't really need this since editor.js will be loaded
        # in default.js (or other presets' modules) anyway, but keeping
        # the tag around helps the browser discover and load this
        # module a little bit earlier.
        prose_editor_js,
    ],
)
prose_editor_admin_media = (
    forms.Media(
        js=[importmap, prose_editor_js]
    )  # Sneak the importmap into the admin <head>
    + prose_editor_base_media
    + forms.Media(
        css={
            "all": [
                "django_prose_editor/editor.css",  # For the ordering
                "django_prose_editor/overrides.css",
            ]
        }
    )
)


def prose_editor_presets():
    return getattr(settings, "DJANGO_PROSE_EDITOR_PRESETS", {}) | {
        "default": [
            prose_editor_js,
            JS("django_prose_editor/default.js", {"type": "module"}),
        ],
        "configurable": [
            prose_editor_js,
            JS("django_prose_editor/configurable.js", {"type": "module"}),
        ],
    }


def prose_editor_media(*, base=prose_editor_base_media, preset="default"):
    """
    Utility for returning a ``forms.Media`` instance containing everything you
    need to initialize a prose editor in the frontend (hopefully!)
    """
    return base + forms.Media(js=[prose_editor_js, *prose_editor_presets()[preset]])


class ProseEditorWidget(forms.Textarea):
    def __init__(self, *args, **kwargs):
        self.config = kwargs.pop("config", {})
        self.preset = kwargs.pop("preset", "default")
        super().__init__(*args, **kwargs)

    @property
    def media(self):
        return prose_editor_media(preset=self.preset)

    def get_config(self):
        config = self.config or {
            "types": None,
            "history": True,
            "html": True,
            "typographic": True,
        }

        # New-style config with "extensions" key
        if isinstance(config, dict) and "extensions" in config:
            config = config | {
                "extensions": expand_extensions(config["extensions"]),
                "js_modules": js_from_extensions(config["extensions"]),
            }

        return config

    def get_context(self, name, value, attrs):
        context = super().get_context(name, value, attrs)
        context["widget"]["attrs"][f"data-django-prose-editor-{self.preset}"] = (
            json.dumps(self.get_config(), separators=(",", ":"), cls=DjangoJSONEncoder)
        )
        return context

    def use_required_attribute(self, _initial):
        # See github.com/feincms/django-prose-editor/issues/66
        return False


class AdminProseEditorWidget(ProseEditorWidget):
    @property
    def media(self):
        return prose_editor_media(
            base=prose_editor_admin_media,
            preset=self.preset,
        )
