Footnote Extension
==================

The Footnote extension adds numbered footnote references to the text and keeps
a matching list of footnotes at the end of the content. References link to
their footnote, and each footnote links back to its reference.

Python Configuration
--------------------

.. code-block:: python

    content = ProseEditorField(
        extensions={
            "Bold": True,
            "Footnote": True,
        },
        sanitize=True,
    )

JavaScript Configuration
------------------------

.. code-block:: javascript

    import { Footnote } from "django-prose-editor/editor"

    // Adds the footnoteReference, footnotes and footnote nodes
    Footnote

Editing
-------

- The menu button (groups ``nodes`` and ``footnote``) inserts a reference at
  the cursor and moves the cursor into the new footnote.
- Clicking a reference jumps to its footnote, clicking ↩ jumps back.
- References are renumbered automatically. Deleting a reference deletes its
  footnote. The footnotes list always stays at the end of the content.

Cross-references
----------------

The cross-reference button (next to the footnote button) opens a dialog
listing the existing footnotes. The selected footnote gets an additional
reference at the cursor position, carrying the same number. The button is
disabled while the document has no footnotes.

Each reference gets its own anchor (``fnref-<id>``, ``fnref-<id>-2``, ...), and
the footnote links back to every reference (``↩a ↩b``). A footnote is only
removed when all of its references have been deleted. Copying and pasting a
reference also creates a cross-reference.

.. code-block:: javascript

    // Open the dialog
    editor.commands.addFootnoteCrossReference()

    // Insert a cross-reference directly
    editor.commands.insertFootnoteCrossReference(id)

    // Jump to the second reference of a footnote
    editor.commands.goToFootnoteReference(id, 2)

Commands
--------

.. code-block:: javascript

    editor.commands.insertFootnote()
    editor.commands.goToFootnote(id)
    editor.commands.goToFootnoteReference(id)

HTML Output
-----------

.. code-block:: html

    <p>A claim<sup class="footnote-ref" id="fnref-k3x9a" data-footnote-id="k3x9a"><a href="#fn-k3x9a">1</a></sup>.</p>
    <ol class="footnotes">
      <li id="fn-k3x9a" data-footnote-id="k3x9a"><span class="footnote-content">The source.</span> <a class="footnote-backref" href="#fnref-k3x9a">↩</a></li>
    </ol>

The output works as-is on the frontend; no further processing is needed.
Sanitization allows exactly these tags, attributes and classes.

Styling
-------

.. code-block:: css

    .footnote-ref a { text-decoration: none; }
    ol.footnotes { border-top: 1px solid #ccc; font-size: 0.9em; }
    .footnote-backref { text-decoration: none; }
