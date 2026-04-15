TextClass Extension
===================

The TextClass extension allows you to apply arbitrary CSS classes to text sections using ``<span class="...">`` tags. This provides a clean, semantic way to style content without relying on inline styles.

Unlike Tiptap's TextStyle extension which uses inline ``style`` attributes, TextClass uses CSS classes, making it more maintainable and allowing for consistent theming across your application.

Basic Usage
-----------

To use the TextClass extension, configure it with a list of allowed CSS classes. Each class can be specified as:

- A string (class name and display title will be the same)
- An object with ``className`` and ``title`` properties for custom display names

.. code-block:: python

    from django_prose_editor.fields import ProseEditorField

    class Article(models.Model):
        content = ProseEditorField(
            extensions={
                "Bold": True,
                "Italic": True,
                "TextClass": {
                    "cssClasses": [
                        "highlight",  # String format
                        "important",
                        {"className": "subtle", "title": "Subtle Text"},  # Object format
                        {"className": "warning", "title": "Warning"}
                    ]
                }
            }
        )

JavaScript Configuration
------------------------

When creating custom presets, you can configure the TextClass extension in JavaScript:

.. code-block:: javascript

    import { TextClass } from "django-prose-editor/editor"

    // Configure with allowed CSS classes (string format)
    TextClass.configure({
        cssClasses: ["highlight", "important", "subtle", "warning"]
    })

    // Configure with custom display titles (object format)
    TextClass.configure({
        cssClasses: [
            "highlight",
            { className: "important", title: "Important Text" },
            { className: "subtle", title: "Subtle Text" },
            { className: "warning", title: "Warning" }
        ]
    })

Menu Integration
----------------

When configured with CSS classes, TextClass automatically adds a dropdown menu to the editor with options for each class. The dropdown includes:

- **default**: Removes any applied text class (returns to normal text)
- Each configured CSS class as a selectable option

When classes are configured as objects with ``title`` properties, the menu will display the custom title while applying the specified ``className``. For string-configured classes, the class name serves as both the CSS class and display title.

The menu items appear in the ``textClass`` group and are typically displayed as a dropdown in the default menu layout.

Commands
--------

The TextClass extension provides these commands:

.. code-block:: javascript

    // Apply a CSS class to selected text
    editor.commands.setTextClass("highlight")

    // Remove text class from selected text
    editor.commands.unsetTextClass()

    // Check if text has a specific class applied
    editor.isActive("textClass", { class: "highlight" })

HTML Output
-----------

The extension generates clean HTML with CSS classes:

.. code-block:: html

    <p>This is <span class="highlight">highlighted text</span> in a paragraph.</p>
    <p>This text has <span class="warning">warning styling</span> applied.</p>

Sanitization
------------

When using server-side sanitization, the TextClass extension automatically configures the sanitizer to allow ``<span>`` tags with ``class`` attributes.

Styling
-------

Define CSS rules in your stylesheet to style the configured classes:

.. code-block:: css

    .ProseMirror .highlight {
        background-color: yellow;
        padding: 2px 4px;
        border-radius: 3px;
    }

    .ProseMirror .important {
        font-weight: bold;
        color: #d32f2f;
    }

    .ProseMirror .subtle {
        opacity: 0.7;
        font-style: italic;
    }

    .ProseMirror .warning {
        background-color: #fff3cd;
        color: #856404;
        padding: 2px 4px;
        border-radius: 3px;
        border: 1px solid #ffeaa7;
    }

Example Use Cases
-----------------

**Content Highlighting**
    Mark important information, key terms, or concepts that need visual emphasis.

**Semantic Markup**
    Apply semantic classes like ``legal-disclaimer``, ``technical-term``, ``brand-name`` for consistent styling.

**Theme Support**
    Use classes that change appearance based on your site's theme (light/dark mode).

**Content Types**
    Distinguish different types of content like ``code-snippet``, ``file-path``, ``ui-element``.

Best Practices
--------------

1. **Use Semantic Class Names**: Choose descriptive names that describe the content's meaning, not its appearance
2. **Limit Available Classes**: Only provide classes that are actually needed to keep the UI clean
3. **Define CSS Consistently**: Ensure all configured classes have corresponding CSS rules
4. **Consider Accessibility**: Use sufficient color contrast and don't rely solely on color for meaning
5. **Document Classes**: Maintain documentation of available classes for content creators

See also
--------

:doc:`classloom` is a more flexible alternative. Using ``type: "text"`` in a
ClassLoom group produces the same ``<span class="...">`` marks as TextClass, but
supports multiple independent groups and requires explicit ``Menu`` configuration
to surface the dropdown.

Comparison with TextStyle
-------------------------

TextClass is preferred over Tiptap's TextStyle extension because:

- **Maintainability**: CSS classes are easier to update than inline styles
- **Consistency**: Classes ensure uniform styling across content
- **Flexibility**: Styles can change based on context (themes, responsive design)
- **Security**: Class names are validated, preventing arbitrary style injection
- **Performance**: CSS classes are more efficient than inline styles
