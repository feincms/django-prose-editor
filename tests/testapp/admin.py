from django import forms
from django.contrib import admin

from django_prose_editor.widgets import ProseEditorWidget
from testapp import models


@admin.register(models.ProseEditorModel)
class ProseEditorModelAdmin(admin.ModelAdmin):
    pass


class SanitizedProseEditorModelForm(forms.ModelForm):
    class Meta:
        widgets = {
            "description": ProseEditorWidget(
                config={
                    "types": ["paragraph", "strong", "em", "link", "heading"],
                    "history": False,
                    "html": False,
                    "typographic": True,
                }
            )
        }


@admin.register(models.SanitizedProseEditorModel)
class SanitizedProseEditorModelAdmin(admin.ModelAdmin):
    form = SanitizedProseEditorModelForm


@admin.register(models.TableProseEditorModel)
class TableProseEditorModelAdmin(admin.ModelAdmin):
    pass


@admin.register(models.ConfigurableProseEditorModel)
class ConfigurableProseEditorModelAdmin(admin.ModelAdmin):
    pass


@admin.register(models.StyleLoomProseEditorModel)
class StyleLoomProseEditorModelAdmin(admin.ModelAdmin):
    pass
