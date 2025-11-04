from django.db import models

from django_prose_editor.fields import ProseEditorField
from django_prose_editor.sanitized import SanitizedProseEditorField


class ProseEditorModel(models.Model):
    description = ProseEditorField()

    def __str__(self):
        return self.description


class SanitizedProseEditorModel(models.Model):
    description = SanitizedProseEditorField()

    def __str__(self):
        return self.description


class TableProseEditorModel(models.Model):
    description = ProseEditorField(
        config={
            "types": [
                "Blockquote",
                "Bold",
                "BulletList",
                "Heading",
                "HorizontalRule",
                "Italic",
                "Link",
                "ListItem",
                "OrderedList",
                "Strike",
                "Subscript",
                "Superscript",
                "Underline",
                "Table",
                "TableRow",
                "TableHeader",
                "TableCell",
            ],
            "history": True,
            "html": True,
            "typographic": True,
        }
    )

    def __str__(self):
        return self.description


class ConfigurableProseEditorModel(models.Model):
    description = ProseEditorField(
        config={
            "extensions": {
                "Bold": True,
                "Italic": True,
                "Table": True,
                "TableRow": True,
                "TableHeader": True,
                "TableCell": True,
                "Heading": {"levels": [1, 2, 3]},  # Limit to h1, h2, h3
                "BlueBold": True,
                "HTML": True,
                "CodeBlock": True,
                "BulletList": True,
                "OrderedList": True,
                "ListItem": True,
                "TextClass": {"cssClasses": ["highlight"]},
                "NodeClass": {
                    "cssClasses": {
                        "paragraph": ["highlight"],
                        "bold": ["emphasis", "important"],
                    }
                },
            }
        },
        sanitize=True,
    )

    def __str__(self):
        return self.description
