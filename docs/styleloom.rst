StyleLoom Extension
===================

StyleLoom adds configurable inline CSS properties to ProseMirror nodes and marks. It is designed for use in custom JavaScript presets. One menu button is created per *context*; each button opens a dialog scoped to the properties that apply at the current cursor position.

Configuration
-------------

The extension takes two top-level options:

``properties``
    A map from CSS property name (kebab-case) to a per-property config object:

    - ``title``: Label shown in the dialog
    - ``description`` *(optional)*: Help text shown below the field
    - ``types``: Array of ProseMirror type names this property applies to. Use ``"textStyle"`` for inline text (requires a non-collapsed text selection).
    - Any additional keys (e.g. ``enum``, ``default``) are forwarded to the dialog schema.

``contexts``
    A map from context key to a context config object. Each context becomes one menu button:

    - ``title`` *(optional)*: Button label. Defaults to the key.
    - ``groups`` *(optional)*: Menu group(s) the button belongs to. Defaults to ``"marks"``.
    - ``types`` *(optional)*: Array of ProseMirror type names this context targets. When omitted, the context acts as a *catch-all* for any types not claimed by another context.

    The button is hidden when nothing in its context applies at the current cursor position.

.. code-block:: javascript

    import { StyleLoom } from "django-prose-editor/editor"

    StyleLoom.configure({
      contexts: {
        // Catch-all for text and anything not claimed elsewhere:
        styles: { title: "Styles", groups: "marks" },

        // Explicit contexts for table elements:
        table:     { title: "Table styles",     groups: "table", types: ["table"] },
        tableCell: { title: "Cell styles",      groups: "table", types: ["tableCell"] },
      },
      properties: {
        "font-size":        { title: "Font size",    description: "e.g. 1.5em", types: ["textStyle"] },
        "max-width":        { title: "Max width",    types: ["paragraph", "heading"] },
        "width":            { title: "Width",        types: ["table"] },
        "background-color": { title: "Background",   types: ["tableCell"] },
        "border-style":     { title: "Border style", types: ["table", "tableCell"],
                              enum: ["solid", "dashed", "dotted"] },
      },
    })

Why multiple contexts?
----------------------

When the cursor is inside a table cell, the ancestor tree contains both a ``tableCell`` node and a ``table`` node. A single context targeting ``["table", "tableCell"]`` would walk up from the cursor and stop at the deepest match — the cell — so the dialog would only show cell-level properties. The table-level properties would be unreachable.

Separate contexts solve this: the ``table`` context independently walks up and finds the ``table`` ancestor, while the ``tableCell`` context finds the cell. Both buttons are visible at the same time when the cursor is inside a cell, and each opens a dialog scoped to its own level of the hierarchy.

How contexts resolve
--------------------

When a button is clicked, StyleLoom walks up the ancestor tree from the cursor and finds the deepest node whose type appears in the context's ``types`` list (or, for the catch-all context, among the unclaimed types). A ``textStyle`` property is included only when the selection is non-empty and not a node selection. The dialog is built from exactly the properties that match.

A ``NodeSelection`` (e.g. selecting a whole table by clicking its handle) is also handled: the selected node itself is checked before walking ancestors.

HTML output
-----------

Properties are rendered as inline ``style`` attributes on the element's existing tag:

.. code-block:: html

    <table style="width: 100%">…</table>
    <td style="background-color: #f0f0f0">…</td>
    <p style="max-width: 40em">…</p>
    <span style="font-size: 0.85em">small text</span>

Multiple properties on the same element are merged into a single ``style`` attribute by the browser.

Sanitization
------------

``StyleLoom`` needs to be added to ``EXTENSION_MAPPING`` or the ``DJANGO_PROSE_EDITOR_EXTENSIONS`` setting for server-side sanitization. The processor reads the ``properties`` configuration and allows ``style`` on the relevant HTML tags. For ``"textStyle"`` properties it also allows ``<span>`` as a tag.
