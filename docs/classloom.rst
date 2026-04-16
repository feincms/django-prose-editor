ClassLoom Extension
===================

ClassLoom adds CSS class management to ProseMirror nodes and marks. Each *group* of classes targets one specific node or mark type and produces its own menu dropdown.

Groups
------

The extension is configured with a ``groups`` object. Each key becomes a menu group named ``classLoom:<key>``. Each group has:

- ``title``: Label shown in the menu button and dialog
- ``type``: ProseMirror node or mark type name, or the special value ``"text"``
- ``classes``: Array of class names — strings, or ``{ className, title }`` objects
- ``combinable`` *(optional)*: If ``true``, multiple classes from the group can be active at once. Default is exclusive (selecting one clears the others).
- ``priority`` *(optional)*: Mark priority for ``"text"``-type groups. Default is ``101``.

The ``"text"`` type is special: it creates a dedicated ``<span>`` mark per group, which allows combining classes from multiple text groups on the same selection. All other types add a ``class`` attribute to their existing node or mark.

Python configuration
--------------------

.. code-block:: python

    content = ProseEditorField(
        extensions={
            "Bold": True,
            "Italic": True,
            "Table": True,
            "ClassLoom": {
                "groups": {
                    "tableStyles": {
                        "title": "Table style",
                        "type": "table",
                        "classes": [
                            {"className": "table--bordered", "title": "Bordered"},
                            {"className": "table--striped",  "title": "Striped"},
                        ],
                    },
                    "emphasisStyles": {
                        "title": "Emphasis style",
                        "type": "italic",
                        "classes": ["theme-color", "grey-color"],
                    },
                    "textDecoration": {
                        "title": "Text decoration",
                        "type": "text",
                        "combinable": True,
                        "classes": [
                            {"className": "color--primary",      "title": "Primary colour"},
                            {"className": "underline--dashed",   "title": "Dashed underline"},
                        ],
                    },
                },
            },
            "Menu": {
                "groups": [
                    {"group": "blockType -lists", "type": "dropdown", "minItems": 2},
                    {"group": "lists"},
                    {"group": "nodes -blockType -lists"},
                    {"group": "marks"},
                    {"group": "classLoom:emphasisStyles", "type": "dropdown"},
                    {"group": "classLoom:textDecoration", "type": "dropdown"},
                    {"group": "link"},
                    {"group": "table"},
                    {"group": "classLoom:tableStyles", "type": "dropdown"},
                    {"group": "history"},
                    {"group": "utility"},
                ],
            },
        }
    )

JavaScript configuration
------------------------

When writing a custom preset in JavaScript:

.. code-block:: javascript

    import { ClassLoom } from "django-prose-editor/editor"

    ClassLoom.configure({
      groups: {
        tableStyles: {
          title: "Table style",
          type: "table",
          classes: [
            { className: "table--bordered", title: "Bordered" },
            { className: "table--striped",  title: "Striped" },
          ],
        },
        textDecoration: {
          title: "Text decoration",
          type: "text",
          combinable: true,
          priority: 102,
          classes: [
            { className: "color--primary",    title: "Primary colour" },
            { className: "underline--dashed", title: "Dashed underline" },
          ],
        },
      },
    })

See also
--------

:doc:`styleloom` is a better fit when the set of possible values is too large to
enumerate as discrete classes — for example a ``font-size`` or ``color`` that users
should be able to type in freely. StyleLoom opens a dialog for each context rather
than a fixed list of buttons.

Menu integration
----------------

Each group produces a dropdown whose name is ``classLoom:<key>``. Add those names to your ``Menu`` configuration (as shown in the Python example above) to make the buttons appear. Each dropdown contains a *default* entry that clears all classes in the group, plus one entry per class.

HTML output
-----------

Classes are added directly to the element's existing tag for node and mark types:

.. code-block:: html

    <table class="table--bordered">…</table>
    <em class="grey-color">italicised text</em>

For ``type: "text"`` groups a wrapping ``<span>`` is used:

.. code-block:: html

    <span class="color--primary">coloured text</span>

Sanitization
------------

When ``ClassLoom`` is listed in the extensions, the sanitizer reads the ``groups`` configuration and allows ``class`` on the relevant HTML tags. For ``type: "text"`` groups it also allows ``<span>`` as a tag.
