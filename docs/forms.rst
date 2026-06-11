Usage outside the Django admin
==============================

The prose editor can easily be used outside the Django admin. The form field
respectively the widget includes the necessary CSS and JavaScript:

.. code-block:: python

    from django_prose_editor.fields import ProseEditorFormField

    class Form(forms.Form):
        text = ProseEditorFormField(
            extensions={"Bold": True, "Italic": True},
            sanitize=True  # Recommended to enable sanitization
        )

Or maybe you want to use ``django_prose_editor.widgets.ProseEditorWidget``, but
why make it more complicated than necessary.

If you're rendering the form in a template you have to include the form media:

.. code-block:: html+django

    <form method="post">
      {% csrf_token %}
      {{ form.media }}  {# This is the important line! #}

      {{ form.errors }} {# Always makes sense #}
      {{ form.as_div }}
      <button type="submit">send</button>
    </form>

Note that the form media isn't django-prose-editor specific, that's a Django
feature.


Import maps
-----------

The editor uses ES modules with bare specifiers (e.g. ``django-prose-editor/
editor``), which the browser resolves through an `import map
<https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap>`__.
You do **not** have to set anything up for this: the import map is part of the
widget/field media, so rendering ``{{ form.media }}`` emits it (merged into a
single ``<script type="importmap">``, before the editor modules) automatically.

.. note::

   Earlier versions required wiring up the ``js_asset.context_processors.importmap``
   context processor and adding ``{{ importmap }}`` to your base template. That
   global import map has been removed -- it is no longer needed, and you can
   drop both the context processor and the ``{{ importmap }}`` tag.


CSS custom properties
---------------------

The django-prose-editor CSS uses the following CSS custom properties:

* ``--prose-editor-background``
* ``--prose-editor-foreground``
* ``--prose-editor-border-color``
* ``--prose-editor-active-color``
* ``--prose-editor-disabled-color``

If you do not set them, they get their value from the following properties that
are defined in the Django admin's CSS:

* ``--border-color``
* ``--body-fg``
* ``--body-bg``
* ``--primary``

You should set these properties with appropriate values to use
django-prose-editor outside the admin in your site.

In addition, you may optionally set a ``--prose-editor-typographic`` property
to control the color of typographic characters when shown.
