Installation
============

The first step is to ensure that you have an activated virtualenv for your
current project, using something like ``. .venv/bin/activate``.

Install the package into your environment:

.. code-block:: shell

    pip install django-prose-editor[sanitize]

The ``sanitize`` extra automatically installs nh3 for the recommended HTML
sanitization. It's strongly recommended to use this option for secure HTML processing.
You only need to omit this if you plan to use a different HTML sanitizer.

Add ``django_prose_editor`` to ``INSTALLED_APPS``:

.. code-block:: python

    INSTALLED_APPS = [
        # ...
        "django_prose_editor",
    ]

If you want to use the editor outside the Django admin, see :doc:`forms` for
the additional setup required.

Replace ``models.TextField`` with ``ProseEditorField`` where appropriate:

.. code-block:: python

    from django_prose_editor.fields import ProseEditorField

    class Project(models.Model):
        description = ProseEditorField(
            extensions={"Bold": True, "Italic": True},
            sanitize=True  # Recommended to enable sanitization
        )

Note! No migrations will be generated when switching from and to
``models.TextField``. That's by design. Those migrations are mostly annoying.

Besides the model field itself models using a ``ProseEditorField`` will have an
easy way to create excerpts; the method for the example above would be
``get_description_excerpt``.
