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

The menubar has its own properties. Their defaults keep it quieter than the
surrounding admin UI, e.g. the plugin headers of django-content-editor:

* ``--prose-editor-menubar-bg``: The background of the menubar. Defaults to
  ``--prose-editor-background``.
* ``--prose-editor-menubar-border``: The line below the menubar. Defaults to
  the admin's ``--hairline-color``.
* ``--prose-editor-menubar-shadow``: The ``box-shadow`` of the menubar. The
  menubar has no shadow at rest; the shadow is only shown while the menubar
  sticks to the top of the viewport (in browsers supporting `scroll-state
  container queries
  <https://developer.mozilla.org/en-US/docs/Web/CSS/@container#scroll-state_container_descriptors>`__),
  and on floating menubars. Defaults to a soft shadow derived from
  ``--body-fg``.
* ``--prose-editor-menubar-top``: The offset from the top of the viewport
  where the sticky menubar sticks, e.g. the height of another sticky bar above
  it. Defaults to ``0``.

* ``--prose-editor-menubar-idle-opacity``: The opacity of the menubar while
  the editor doesn't have focus. Defaults to ``1``. Set it to ``0`` to only
  show the menubar while the editor has focus (or while the pointer is over
  the menubar), which helps on long pages with many editors. The menubar keeps
  its space, so the layout doesn't jump, and its buttons stay reachable with
  the keyboard.

.. code-block:: css

    :root {
      --prose-editor-menubar-idle-opacity: 0;
      --prose-editor-menubar-bg: var(--darkened-bg);
      --prose-editor-menubar-border: var(--border-color);
      --prose-editor-menubar-shadow: none;
    }

The table buttons mark adding rows and columns with
``--prose-editor-icon-add-color`` (defaults to green) and removing them with
``--prose-editor-icon-remove-color`` (defaults to the admin's ``--error-fg``).

Code blocks use ``--prose-editor-code-block-bg`` and
``--prose-editor-code-block-fg`` (light text on a dark background by default).
Everything else, e.g. placeholders, blockquotes, horizontal rules and table
selections, takes its colours from the admin's variables listed above and
``--hairline-color`` and ``--body-quiet-color``, so it also works in the admin's
dark mode.

In addition, you may optionally set a ``--prose-editor-special-characters``
property to control the color of special characters (non-breaking spaces and
soft hyphens) when shown by the ``SpecialCharacters`` extension. The old
``--prose-editor-typographic`` property is still supported as a fallback.
