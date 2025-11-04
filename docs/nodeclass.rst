NodeClass Extension
===================

The NodeClass extension allows you to apply arbitrary CSS classes to both block-level nodes (paragraphs, tables, table cells, etc.) and marks (bold, italic, links, etc.) using global attributes. This provides a clean, semantic way to style elements without requiring individual node or mark type extensions.

Unlike TextClass which applies to inline text using ``<span>`` tags, NodeClass works with both block-level elements and marks by adding CSS classes directly to their HTML tags (e.g., ``<p class="highlight">``, ``<table class="bordered">``, ``<strong class="emphasis">``).

Basic Usage
-----------

To use the NodeClass extension, configure it with CSS classes organized by node or mark type. Each class can be specified as:

- A string (class name and display title will be the same)
- An object with ``className`` and ``title`` properties for custom display names

.. code-block:: python

    from django_prose_editor.fields import ProseEditorField

    class Article(models.Model):
        content = ProseEditorField(
            extensions={
                "Bold": True,
                "Italic": True,
                "Table": True,
                "NodeClass": {
                    "cssClasses": {
                        # Node types
                        "paragraph": {
                            "title": "Paragraph",
                            "cssClasses": [
                                "highlight",
                                "callout",
                                {"className": "centered", "title": "Centered Text"}
                            ]
                        },
                        "table": {
                            "title": "Table",
                            "cssClasses": [
                                "bordered",
                                "striped",
                                {"className": "compact", "title": "Compact Table"}
                            ]
                        },
                        "tableCell": {
                            "title": "Cell",
                            "cssClasses": [
                                "centered",
                                "right-aligned",
                                {"className": "numeric", "title": "Numeric Cell"}
                            ]
                        },
                        "heading": {
                            "title": "Heading",
                            "cssClasses": [
                                "section-title",
                                {"className": "accent", "title": "Accent Heading"}
                            ]
                        },
                        # Mark types
                        "bold": {
                            "title": "Bold",
                            "cssClasses": [
                                "emphasis",
                                {"className": "important", "title": "Important"}
                            ]
                        },
                        "link": {
                            "title": "Link",
                            "cssClasses": [
                                "external",
                                "download",
                                {"className": "button", "title": "Button Link"}
                            ]
                        }
                    }
                }
            }
        )

Alternative Simple Configuration
--------------------------------

For simpler use cases, you can still use the array format without custom titles:

.. code-block:: python

    class Article(models.Model):
        content = ProseEditorField(
            extensions={
                "NodeClass": {
                    "cssClasses": {
                        # Node types
                        "paragraph": ["highlight", "callout", "centered"],
                        "table": ["bordered", "striped", "compact"],
                        "tableCell": ["centered", "right-aligned", "numeric"],
                        "bulletList": ["checklist", "no-bullets", "spaced"],
                        # Mark types
                        "bold": ["emphasis", "important"],
                        "link": ["external", "download", "button"]
                    }
                }
            }
        )

JavaScript Configuration
------------------------

When creating custom presets, you can configure the NodeClass extension in JavaScript:

.. code-block:: javascript

    import { NodeClass } from "django-prose-editor/editor"

    // Configuration for nodes and marks
    NodeClass.configure({
        cssClasses: {
            // Node types
            paragraph: ["highlight", "callout", "centered"],
            table: ["bordered", "striped", "compact"],
            tableCell: ["centered", "right-aligned", "numeric"],
            heading: ["section-title", "accent"],
            // Mark types
            bold: ["emphasis", "important"],
            link: ["external", "download", "button"]
        }
    })

    // Mixed configuration with custom titles
    NodeClass.configure({
        cssClasses: {
            paragraph: [
                "highlight",
                { className: "callout", title: "Callout Box" }
            ],
            table: [
                { className: "bordered", title: "Bordered Table" },
                { className: "striped", title: "Striped Rows" }
            ],
            bold: [
                { className: "emphasis", title: "Emphasis" },
                { className: "important", title: "Important" }
            ]
        }
    })

Supported Types
---------------

The following node and mark types are supported for CSS class application:

**Node Types:**

- **paragraph**: Paragraph elements (``<p>``)
- **table**: Table elements (``<table>``)
- **tableCell**: Table cells (``<td>``, ``<th>``)
- **tableRow**: Table rows (``<tr>``)
- **heading**: Heading elements (``<h1>``-``<h6>``)
- **listItem**: List items (``<li>``)
- **bulletList**: Unordered lists (``<ul>``)
- **orderedList**: Ordered lists (``<ol>``)
- **blockquote**: Blockquote elements (``<blockquote>``)
- **codeBlock**: Code block elements (``<pre>``)

**Mark Types:**

- **bold**: Bold text (``<strong>``)
- **italic**: Italic text (``<em>``)
- **link**: Links (``<a>``)
- **code**: Inline code (``<code>``)
- **strike**: Strikethrough text (``<s>``)
- **underline**: Underlined text (``<u>``)

Menu Integration
----------------

When configured with CSS classes, NodeClass automatically adds context-sensitive dropdown menus to the editor. The menu options change based on the currently selected node or mark type:

- When a paragraph is selected, only paragraph classes are shown
- When a table is selected, only table classes are shown
- When text with a bold mark is selected, bold classes are shown
- When a link is selected, link classes are shown

Each dropdown includes:

- **Reset classes**: Removes any applied classes from nodes and marks (returns to normal styling)
- Each configured CSS class for the applicable types as a selectable option

The menu items appear in the ``nodeClass`` group and are contextually filtered. Mark class options are hidden when the selection is empty or when the mark type is not active in the current selection.

Commands
--------

The NodeClass extension works automatically through menu integration. For marks, classes are applied using the standard mark commands:

.. code-block:: javascript

    // For marks: Apply a mark with a specific class
    editor.commands.setMark("bold", { class: "emphasis" })
    editor.commands.setMark("link", { class: "external" })

    // Check if a mark with a specific class is active
    editor.isActive("bold", { class: "emphasis" })
    editor.isActive("link", { class: "external" })

    // Remove marks (which removes their classes)
    editor.commands.unsetMark("bold")

HTML Output
-----------

The extension adds CSS classes directly to both block-level elements and marks:

.. code-block:: html

    <!-- Node classes -->
    <p class="highlight">This paragraph has highlighting applied.</p>

    <table class="bordered striped">
        <tr>
            <th class="centered">Header</th>
            <td class="numeric">123.45</td>
        </tr>
    </table>

    <h2 class="section-title">Section Heading</h2>

    <blockquote class="callout">
        <p>Important quote or callout text.</p>
    </blockquote>

    <!-- Mark classes -->
    <p>This is <strong class="emphasis">emphasized bold text</strong>.</p>

    <p>Visit our <a href="https://example.com" class="external">website</a>.</p>

    <p>This is <strong class="important">very important</strong> information.</p>

Sanitization
------------

When using server-side sanitization, the NodeClass extension automatically configures the sanitizer to allow ``class`` attributes on all supported block-level elements and marks.

Styling Examples
----------------

Define CSS rules in your stylesheet to style the configured classes for both nodes and marks:

.. code-block:: css

    /* Paragraph classes */
    .ProseMirror p.highlight {
        background-color: #fff3cd;
        padding: 1rem;
        border-radius: 4px;
        border-left: 4px solid #ffc107;
    }

    .ProseMirror p.callout {
        background-color: #e3f2fd;
        padding: 1rem;
        border-radius: 4px;
        border-left: 4px solid #2196f3;
        font-weight: 500;
    }

    .ProseMirror p.centered {
        text-align: center;
    }

    /* Table classes */
    .ProseMirror table.bordered {
        border: 2px solid #dee2e6;
        border-collapse: collapse;
    }

    .ProseMirror table.bordered td,
    .ProseMirror table.bordered th {
        border: 1px solid #dee2e6;
    }

    .ProseMirror table.striped tr:nth-child(even) {
        background-color: #f8f9fa;
    }

    .ProseMirror table.compact {
        font-size: 0.875rem;
    }

    .ProseMirror table.compact td,
    .ProseMirror table.compact th {
        padding: 0.25rem 0.5rem;
    }

    /* Table cell classes */
    .ProseMirror td.centered,
    .ProseMirror th.centered {
        text-align: center;
    }

    .ProseMirror td.right-aligned {
        text-align: right;
    }

    .ProseMirror td.numeric,
    .ProseMirror th.numeric {
        text-align: right;
        font-family: 'Monaco', 'Menlo', monospace;
    }

    /* Heading classes */
    .ProseMirror h1.section-title,
    .ProseMirror h2.section-title {
        border-bottom: 2px solid #e9ecef;
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
    }

    .ProseMirror .accent {
        color: #6f42c1;
        border-left: 4px solid #6f42c1;
        padding-left: 1rem;
    }

    /* Mark classes */
    .ProseMirror strong.emphasis {
        color: #d32f2f;
        font-weight: 700;
    }

    .ProseMirror strong.important {
        background-color: #fff176;
        padding: 0 0.25rem;
        font-weight: 900;
    }

    .ProseMirror a.external::after {
        content: " ↗";
        font-size: 0.8em;
    }

    .ProseMirror a.button {
        display: inline-block;
        padding: 0.5rem 1rem;
        background-color: #2196f3;
        color: white;
        text-decoration: none;
        border-radius: 4px;
    }

    .ProseMirror a.button:hover {
        background-color: #1976d2;
    }

    /* List classes */
    .ProseMirror ul.checklist {
        list-style: none;
        padding-left: 1.5rem;
    }

    .ProseMirror ul.checklist li:before {
        content: "☐ ";
        margin-right: 0.5rem;
    }

    .ProseMirror ul.no-bullets {
        list-style: none;
        padding-left: 1rem;
    }

    .ProseMirror ol.alpha {
        list-style-type: lower-alpha;
    }

    .ProseMirror ol.roman {
        list-style-type: lower-roman;
    }

    .ProseMirror .spaced li,
    .ProseMirror .outline li {
        margin-bottom: 0.5rem;
    }

Example Use Cases
-----------------

**Table Styling**
    Apply consistent styling to tables with node-specific classes:

    - Tables: ``bordered``, ``striped``, ``compact``
    - Cells: ``centered``, ``right-aligned``, ``numeric``

**Content Organization**
    Use different classes for different content types:

    - Paragraphs: ``highlight``, ``callout``, ``summary``
    - Headings: ``section-title``, ``chapter-heading``

**Layout Control**
    Apply layout modifications per node type:

    - Paragraphs: ``centered``, ``justified``
    - Tables: ``full-width``, ``auto-width``

**Semantic Styling**
    Use semantic classes that make sense for specific elements:

    - Code blocks: ``language-python``, ``terminal``
    - Blockquotes: ``testimonial``, ``definition``

Best Practices
--------------

1. **Node-Specific Classes**: Define classes that make sense for each node type rather than applying all classes globally
2. **Semantic Naming**: Use class names that describe purpose (``numeric-cell``) rather than appearance (``right-aligned``)
3. **Consistent Patterns**: Use consistent naming patterns across node types (``table-compact``, ``paragraph-compact``)
4. **Limit Options**: Don't overwhelm users with too many class options per node type
5. **Test Combinations**: Verify that multiple classes work well together on the same node
6. **Document Usage**: Provide clear guidelines on when to use each class

Configuration Patterns
-----------------------

**Content-Focused Pattern**
    Organize classes by content purpose:

.. code-block:: python

    "cssClasses": {
        "paragraph": ["intro", "summary", "highlight", "note"],
        "heading": ["chapter", "section", "subsection"],
        "table": ["data", "comparison", "summary"]
    }

**Layout-Focused Pattern**
    Organize classes by visual layout:

.. code-block:: python

    "cssClasses": {
        "paragraph": ["centered", "justified", "indented"],
        "table": ["full-width", "compact", "bordered"],
        "tableCell": ["centered", "right", "nowrap"]
    }

**Mixed Pattern**
    Combine content and layout classes:

.. code-block:: python

    "cssClasses": {
        "paragraph": [
            # Content classes
            "highlight", "note", "warning",
            # Layout classes
            "centered", "indented"
        ],
        "table": [
            # Style classes
            "bordered", "striped",
            # Layout classes
            "compact", "full-width"
        ]
    }

Comparison with TextClass
-------------------------

NodeClass complements TextClass by targeting different content levels:

- **TextClass**: Applies to inline text spans using ``<span>`` tags (``<span class="...">``)
- **NodeClass**: Applies to both:

  - Entire block-level elements (``<p class="...">``, ``<table class="...">``)
  - Inline marks using their native tags (``<strong class="...">``, ``<a class="...">``)

Use TextClass when you need a generic ``<span>`` wrapper for styling arbitrary text, and NodeClass when you want to style specific nodes or marks with their semantic HTML tags. They can be used together for comprehensive styling control.

**Note**: If you use the same name for both a node type and a mark type in ``cssClasses``, only the node type configuration will be recognized by the NodeClass extension.
