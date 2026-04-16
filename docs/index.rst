===================
django-prose-editor
===================

Prose editor for the Django admin based on ProseMirror and Tiptap. `Announcement blog post <https://406.ch/writing/django-prose-editor-prose-editing-component-for-the-django-admin/>`__.

After installing the package (using ``pip install
django-prose-editor[sanitize]``) the following should get you started:

.. code-block:: python

    from django_prose_editor.fields import ProseEditorField

    content = ProseEditorField(
        extensions={
            "Bold": True,
            "Italic": True,
            "BulletList": True,
            "Link": True,
        },
        sanitize=True  # Enable sanitization based on extension configuration
    )


.. toctree::
   :maxdepth: 2
   :caption: Table of contents

   installation
   configuration
   sanitization
   custom_extensions
   menu
   nodeclass
   textclass
   classloom
   styleloom
   presets
   legacy
   forms
   system_checks
   bundlers
   development
   changelog
