Presets
=======

For advanced customization, you can create custom presets by adding
additional assets to load:

.. code-block:: python

    from js_asset import Script

    DJANGO_PROSE_EDITOR_PRESETS = {
        "announcements": [
            Script("prose-editors/announcements.js", type="module"),
        ],
    }

The preset can be selected when instantiating the field:

.. code-block:: python

    text = ProseEditorField(
        _("text"),
        preset="announcements",
        sanitize=False,  # The default configuration may be too restrictive.
    )

The editor uses ES modules and importmaps; you can import extensions and
utilities from the `django-prose-editor/editor` module. The importmap support
is provided by `django-js-asset
<https://github.com/matthiask/django-js-asset/>`_, check it's README to learn
more.

Here's the example:

.. code-block:: javascript

    import {
      // Always recommended:
      Document, Dropcursor, Gapcursor, Paragraph, HardBreak, Text,

      // Add support for a few marks:
      Bold, Italic, Subscript, Superscript, Link,

      // A menu is always nice:
      Menu,

      // Helper which knows how to attach a prose editor to a textarea:
      createTextareaEditor,

      // Helper which runs the initialization on page load and when
      // new textareas are added through Django admin inlines:
      initializeEditors,
    } from "django-prose-editor/editor"


    // "announcements" is the name of the preset.
    const marker = "data-django-prose-editor-announcements"

    function createEditor(textarea) {
      if (textarea.closest(".prose-editor")) return
      const config = JSON.parse(textarea.getAttribute(marker))

      const extensions = [
        Document, Dropcursor, Gapcursor, Paragraph, HardBreak, Text,

        Bold, Italic, Subscript, Superscript, Link,

        Menu,
      ]

      return createTextareaEditor(textarea, extensions)
    }

    initializeEditors(createEditor, `[${marker}]`)

JavaScript Events
-----------------

The configurable editor fires custom events that you can listen for in your frontend code:

**prose-editor:ready**

This event is fired when an editor is fully initialized and ready to use. It's dispatched on the textarea element and bubbles up the DOM.

.. code-block:: javascript

    // Listen for editor initialization
    document.addEventListener('prose-editor:ready', (event) => {
        // Access the editor instance and the textarea
        const { editor, textarea } = event.detail;

        // Example: Focus the editor when it's ready
        editor.commands.focus();

        // Example: Get the textarea's ID for reference
        console.log(`Editor ready for ${textarea.id}`);
    });

The event provides an object in the `detail` property with:
- `editor`: The initialized editor instance with full access to Tiptap commands and API
- `textarea`: The original textarea element that was enhanced with the editor

This is useful when you need to interact with editors programmatically or initialize other components that depend on the editor being fully loaded.
