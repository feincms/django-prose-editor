"""Tests for the new configurable prose editor field."""

import json

from django.forms.models import ModelForm
from django.test import TestCase

from django_prose_editor.config import DEFAULT_MENU_GROUPS
from testapp.models import ConfigurableProseEditorModel


class ConfigurableFormTestCase(TestCase):
    """Tests for the configurable field form rendering."""

    def test_extensions_explicit_configuration(self):
        """Test that extensions are configured as explicitly specified."""

        class TestForm(ModelForm):
            class Meta:
                model = ConfigurableProseEditorModel
                fields = ["description"]

        form = TestForm()
        widget = form.fields["description"].widget

        context = widget.get_context("description", "", {})
        config = json.loads(
            context["widget"]["attrs"]["data-django-prose-editor-configurable"]
        )

        # The original extensions should be there
        assert "Bold" in config["extensions"]
        assert "Italic" in config["extensions"]
        assert "Table" in config["extensions"]

        # The custom BlueBold extension should also be included
        assert "BlueBold" in config["extensions"]

        # ListItem should be there because it's explicitly configured
        assert "ListItem" in config["extensions"]

        # Table dependencies are now explicitly configured in the model
        assert "TableRow" in config["extensions"]
        assert "TableHeader" in config["extensions"]
        assert "TableCell" in config["extensions"]

        # Core extensions should always be included
        assert "Paragraph" in config["extensions"]
        assert "Document" in config["extensions"]
        assert "Text" in config["extensions"]

    def test_heading_levels_config(self):
        """Test that heading levels are properly passed to the widget."""

        class TestForm(ModelForm):
            class Meta:
                model = ConfigurableProseEditorModel
                fields = ["description"]

        form = TestForm()
        widget = form.fields["description"].widget

        # Get the expanded extensions from the widget attributes

        context = widget.get_context("description", "", {})
        config = json.loads(
            context["widget"]["attrs"]["data-django-prose-editor-configurable"]
        )

        # Check that Heading is in extensions with the proper configuration
        assert "Heading" in config["extensions"]
        assert config["extensions"]["Heading"]["levels"] == [1, 2, 3]

        assert config["extensions"] == widget.config["extensions"] | {
            "Document": True,
            "Dropcursor": True,
            "Gapcursor": True,
            "Paragraph": True,
            "Text": True,
            "Menu": {"groups": DEFAULT_MENU_GROUPS},
            "NoSpellCheck": True,
            # Enable history by default unless explicitly disabled
            "History": True,
            # No automatic dependencies are added
        }

    def test_sanitization_works(self):
        """Test that basic sanitization works correctly with ConfigurableProseEditorField."""

        # Create a form instance
        class TestForm(ModelForm):
            class Meta:
                model = ConfigurableProseEditorModel
                fields = ["description"]

        # Test that script tags are removed
        html = "<p>Text with <script>alert('XSS');</script></p>"
        form = TestForm(data={"description": html})
        assert form.is_valid()

        # Create and save the model instance to trigger sanitization
        instance = form.save()
        sanitized = instance.description
        assert "<p>Text with </p>" == sanitized, "Script tags should be removed"

        # Test that basic formatting is preserved
        html = "<p><strong>Bold</strong> and <em>italic</em> text</p>"
        form = TestForm(data={"description": html})
        assert form.is_valid()
        instance = form.save()
        sanitized = instance.description
        assert "<p><strong>Bold</strong> and <em>italic</em> text</p>" == sanitized, (
            "Standard formatting should be preserved"
        )

        # Test that table elements are preserved
        html = "<table><tr><th>Header</th></tr><tr><td>Cell</td></tr></table>"
        form = TestForm(data={"description": html})
        assert form.is_valid()
        instance = form.save()
        sanitized = instance.description
        assert (
            "<table><tbody><tr><th>Header</th></tr><tr><td>Cell</td></tr></tbody></table>"
            == sanitized
        ), "Table elements should be preserved with proper structure"

        # Heading levels are configured as [1, 2, 3] in the model
        # Check that h1, h2, h3 are preserved but h4 is filtered out
        html = "<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4>"
        form = TestForm(data={"description": html})
        assert form.is_valid()
        instance = form.save()
        instance.full_clean()
        sanitized = instance.description

        # Check that h1, h2, h3 tags are preserved
        assert "<h1>" in sanitized, "h1 should be preserved"
        assert "<h2>" in sanitized, "h2 should be preserved"
        assert "<h3>" in sanitized, "h3 should be preserved"

        # h4 should be removed since it's not in the allowed levels [1, 2, 3]
        assert "<h4>" not in sanitized, "h4 should be removed"
        # But the content should still be there
        assert "H4" in sanitized, "content from h4 should still exist"

        # Test that unsupported tags (sub, sup) are removed
        html = "<p>Normal text with <sub>subscript</sub> and <sup>superscript</sup></p>"
        form = TestForm(data={"description": html})
        assert form.is_valid()
        instance = form.save()
        sanitized = instance.description
        assert "<sub>" not in sanitized, "sub tags should be removed"
        assert "<sup>" not in sanitized, "sup tags should be removed"
        assert "subscript" in sanitized, "content from sub should still exist"
        assert "superscript" in sanitized, "content from sup should still exist"

        # Test link sanitization - Link is not in the extensions list,
        # so it should be removed
        html = '<p>Link with <a href="https://example.com" target="_blank" rel="noopener">attributes</a></p>'
        form = TestForm(data={"description": html})
        assert form.is_valid()
        instance = form.save()
        sanitized = instance.description
        # Link tag should be removed since it's not in the extensions
        assert "<a href" not in sanitized, "link tag should be removed"
        assert 'target="_blank"' not in sanitized, "target attribute should be removed"
        # But the content should still be there
        assert "Link with attributes" in sanitized, "link text should be preserved"
