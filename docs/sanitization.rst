Sanitization and Security
=========================

Server-side Sanitization
------------------------

The recommended approach for sanitization is to use the extensions mechanism with the ``sanitize=True`` parameter. This automatically generates appropriate sanitization rules for nh3 based on your specific extension configuration:

.. code-block:: python

    # Enable sanitization based on extension configuration
    content = ProseEditorField(
        extensions={"Bold": True, "Link": True},
        sanitize=True
    )

This ensures that the sanitization ruleset precisely matches your enabled extensions, providing strict security with minimal impact on legitimate content.

How Sanitization Works with Extensions
--------------------------------------

When you enable extensions, the sanitization system automatically generates rules that match your configuration. For example:

.. code-block:: python

    content = ProseEditorField(
        extensions={
            "Link": {
                "protocols": ["http", "https", "mailto"],  # Only allow these protocols
            }
        },
        sanitize=True
    )

This will automatically restrict URLs during sanitization to only the specified protocols, removing any links with other protocols like ``javascript:`` or ``data:``.

Accessing Sanitization Rules Directly
-------------------------------------

You can also access the generated sanitization rules directly:

.. code-block:: python

    from django_prose_editor.config import allowlist_from_extensions

    allowlist = allowlist_from_extensions(extensions={"Bold": True, "Link": True})
    # Returns {"tags": ["strong", "a"], "attributes": {"a": ["href", "title", "rel", "target"]}}

Creating Custom Sanitizers
---------------------------

You can create a custom sanitizer function from any extension configuration using the `create_sanitizer` utility:

.. code-block:: python

    from django_prose_editor.fields import create_sanitizer

    # Create a sanitizer function for a specific set of extensions
    my_sanitizer = create_sanitizer({
        "Bold": True,
        "Italic": True,
        "Link": {"enableTarget": True}
    })

    # Use the sanitizer in your code
    sanitized_html = my_sanitizer(unsafe_html)

This is particularly useful when you need a standalone sanitizer that matches your editor configuration without using the entire field.

Extension-to-HTML Mapping
-------------------------

This table shows how editor extensions map to HTML elements and attributes:

============== ======================= ============================
Extension      HTML Elements           HTML Attributes
============== ======================= ============================
Bold           <strong>                -
Italic         <em>                    -
Strike         <s>                     -
Underline      <u>                     -
Subscript      <sub>                   -
Superscript    <sup>                   -
Heading        <h1> to <h6>            -
BulletList     <ul>                    -
OrderedList    <ol>                    start, type
ListItem       <li>                    -
Blockquote     <blockquote>            -
HorizontalRule <hr>                    -
Link           <a>                     href, title, target, rel
Table          <table>, <tr>,          rowspan, colspan
               <th>, <td>,             class="tableWrapper" on
               <div> (renderWrapper)   <div> (renderWrapper)
============== ======================= ============================

Custom Sanitization
-------------------

You can also pass your own callable receiving and returning HTML
using the ``sanitize`` keyword argument if you need custom sanitization logic:

.. code-block:: python

    def my_custom_sanitizer(html):
        # Your custom sanitization logic here
        return cleaned_html

    content = ProseEditorField(
        extensions={"Bold": True, "Link": True},
        sanitize=my_custom_sanitizer
    )

Note that when using a custom sanitizer, you're responsible for ensuring that the sanitization rules match your enabled extensions.

Security Best Practices
-----------------------

1. **Always use sanitization**: Enable ``sanitize=True`` or provide a custom sanitizer
2. **Match extensions to sanitization**: Use the extension-based sanitization to ensure consistency between what the editor allows and what gets sanitized
3. **Restrict protocols**: When using Link extensions, limit protocols to trusted schemes (http, https, mailto)
4. **Validate on the server**: Never trust client-side validation alone - always sanitize on the server side
5. **Regular updates**: Keep nh3 and django-prose-editor updated for security patches
6. **Test your configuration**: Verify that your sanitization rules work as expected with your specific extension configuration
