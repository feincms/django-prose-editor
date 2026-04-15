Configuration
=============

Introduction
------------

ProseMirror does a really good job of only allowing content which conforms to a
particular scheme. Of course users can submit what they want, they are not
constrainted by the HTML widgets you're using. You should always sanitize the
HTML submitted on the server side.

The recommended approach is to use the extensions mechanism for configuring the
prose editor field which automatically synchronizes editor extensions with
sanitization rules:

.. code-block:: python

    from django_prose_editor.fields import ProseEditorField

    content = ProseEditorField(
        extensions={
            "Bold": True,
            "Italic": True,
            "BulletList": True,
            "ListItem": True,
            "Link": True,
        },
        sanitize=True,  # Server side sanitization is strongly recommended.
    )

This ensures that the HTML sanitization rules exactly match what the editor
allows, preventing inconsistencies between editing capabilities and allowed
output. Note that you need the nh3 library for this which is automatically
installed when you specify the requirement as
``django-prose-editor[sanitize]``.


Overview
--------

The editor can be customized in several ways:

1. Using the new extensions mechanism with ``ProseEditorField`` (recommended).
2. Using the ``config`` parameter to include/exclude specific extensions
   (legacy approach)
3. Creating custom presets for more advanced customization

Note that the ``ProseEditorField`` automatically uses the extension mechanism
when passing ``extensions`` and falls back to the legacy behavior otherwise.


Example Configuration
---------------------

The ``extensions`` parameter allows you to specify exactly which extensions you
want to enable in your editor:

.. code-block:: python

    from django_prose_editor.fields import ProseEditorField

    class Article(models.Model):
        content = ProseEditorField(
            extensions={
                # Core text formatting
                "Bold": True,
                "Italic": True,
                "Strike": True,
                "Underline": True,
                "HardBreak": True,

                # Structure
                "Heading": {
                    "levels": [1, 2, 3]  # Only allow h1, h2, h3
                },
                "BulletList": True,
                "OrderedList": True,
                "ListItem": True, # Used by BulletList and OrderedList
                "Blockquote": True,

                # Advanced extensions
                "Link": {
                    "enableTarget": True,  # Enable "open in new window"
                    "protocols": ["http", "https", "mailto"],  # Limit protocols
                },
                "Table": True,
                "TableRow": True,
                "TableHeader": True,
                "TableCell": True,

                # Editor capabilities
                "History": True,       # Enables undo/redo
                "HTML": True,          # Allows HTML view
                "Typographic": True,   # Enables typographic chars
            }
        )

You can also pass additional configurations to extensions:

.. code-block:: python

    content = ProseEditorField(
        extensions={
            "Bold": True,
            "Italic": True,
            "Heading": {"levels": [1, 2, 3]},  # Only allow H1-H3
            "Link": {"enableTarget": False},  # Disable "open in new tab"
        }
    )

Available extensions include:

* Text formatting: ``Bold``, ``Italic``, ``Strike``, ``Subscript``, ``Superscript``, ``Underline``
* Lists: ``BulletList``, ``OrderedList``, ``ListItem``
* Structure: ``Blockquote``, ``Heading``, ``HorizontalRule``
* Links: ``Link``
* Tables: ``Table``, ``TableRow``, ``TableHeader``, ``TableCell``
* Images and figures: ``Figure``, ``Caption`` (see below)

Check the source code for more!

The extensions which are enabled by default are ``Document``, ``Paragraph`` and
``Text`` for the document, ``Menu``, ``History``, ``Dropcursor`` and
``Gapcursor`` for the editor functionality and ``NoSpellCheck`` to avoid ugly
spell checker interference. You may disable some of these core extensions e.g.
by adding ``"History": False`` to the extensions dict.


Common Extension Configurations
--------------------------------

Django Prose Editor provides special configuration options for common extensions:

**Heading Level Restrictions**

You can restrict heading levels to a subset of H1-H6:

.. code-block:: python

    content = ProseEditorField(
        extensions={
            "Heading": {
                "levels": [1, 2, 3],  # Only allow H1, H2, H3
            }
        }
    )

This configuration will only allow the specified heading levels in both the editor
and the sanitized output.

**Links without 'open in new tab' functionality**

.. code-block:: python

    content = ProseEditorField(
        extensions={
            "Link": {
                "enableTarget": False,
            }
        }
    )

The default is to show a checkbox for this function.

**Link Protocol Restrictions**

You can restrict which URL protocols are allowed:

.. code-block:: python

    content = ProseEditorField(
        extensions={
            "Link": {
                "protocols": ["http", "https", "mailto"],  # Only allow these protocols
            }
        }
    )

**Figures and Images**

The ``Figure`` extension allows inserting images optionally wrapped in a
``<figure>`` element with a ``<figcaption>``. Enabling it automatically pulls
in the ``Image`` and ``Caption`` extensions as well.

.. code-block:: python

    content = ProseEditorField(
        extensions={
            "Figure": True,
        }
    )

A toolbar button opens a dialog for the image URL and alt text. Once an image
is in the document, a floating bubble menu appears when it is selected,
offering "Add caption" and "Remove caption" actions. Removing the caption from
a figure also removes the ``<figure>`` wrapper, leaving a bare ``<img>``.

**Figures with a file browser**

The ``pickerUrl`` option integrates a file browser into the image dialog. A
"Browse…" button will appear next to the URL field and open the file browser
in a popup window.

The file browser endpoint must implement the `CKEditor 4 filebrowser protocol
<https://ckeditor.com/docs/ckeditor4/latest/guide/dev_file_browser_api.html>`__:
the editor appends ``?CKEditorFuncNum=N`` to the URL, and the file browser is
expected to call ``window.opener.CKEDITOR.tools.callFunction(N, url)`` once a
file has been selected. Despite the name, no actual CKEditor 4 installation is
required — this is simply the protocol that many Django file manager packages
have adopted. Examples include `django-cabinet
<https://django-cabinet.readthedocs.io/>`__ (``/admin/cabinet/file/``) and
django-filer.

.. code-block:: python

    content = ProseEditorField(
        extensions={
            "Figure": {
                "pickerUrl": "/admin/cabinet/file/",
            },
        }
    )
