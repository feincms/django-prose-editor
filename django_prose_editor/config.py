"""
Configuration system for Django Prose Editor.

This module provides a way to define editor extensions and generate
corresponding sanitization rules for server-side HTML cleaning.
"""

import warnings
from typing import Any

from django.conf import settings
from django.utils.module_loading import import_string


DEFAULT_MENU_GROUPS = [
    {"group": "blockType -lists", "type": "dropdown", "minItems": 2},
    {"group": "lists"},
    {"group": "nodes -blockType -lists"},
    {"group": "marks"},
    {"group": "nodeClass", "type": "dropdown"},
    {"group": "textClass", "type": "dropdown"},
    {"group": "link"},
    {"group": "textAlign"},
    {"group": "table"},
    {"group": "history"},
    {"group": "utility"},
]


def add_tags_and_attributes(shared_config, tags, attributes):
    # Add tags to the config
    shared_config["tags"].update(tags)

    # Add attributes to the config
    if attributes:
        for tag, allowed_attrs in attributes.items():
            if tag not in shared_config["attributes"]:
                shared_config["attributes"][tag] = set()
            shared_config["attributes"][tag].update(allowed_attrs)


def html_tags(tags, attributes=None):
    """
    Create a simple processor function that adds tags and attributes to the sanitization config.

    Args:
        tags: List of HTML tags
        attributes: Dict mapping tags to allowed attributes

    Returns:
        A processor function that updates the shared config
    """

    def processor(extension_config, shared_config):
        add_tags_and_attributes(shared_config, tags, attributes)

    return processor


def process_heading(config, shared_config):
    """Process Heading extension configuration."""
    levels = (
        c if isinstance(config, dict) and (c := config.get("levels")) else range(1, 7)
    )
    tags = [f"h{level}" for level in levels]
    add_tags_and_attributes(shared_config, tags, None)


def process_link(config, shared_config):
    """Process Link extension configuration."""
    # Prepare tags and attributes
    tags = ["a"]
    attributes = {"a": ["href", "rel", "title"]}
    # If rel is in the list of allowed attributes link_rel has to be set to
    # None.
    shared_config["link_rel"] = None

    # Include target attribute unless explicitly disabled
    target_allowed = True
    if isinstance(config, dict):
        if "enableTarget" in config:
            target_allowed = bool(config["enableTarget"])

        # Include URL schemes if specified (for nh3 sanitization)
        if "protocols" in config:
            if "url_schemes" not in shared_config:
                shared_config["url_schemes"] = set()
            shared_config["url_schemes"].update(config["protocols"])

    # Add target attribute if allowed
    if target_allowed:
        attributes["a"].append("target")

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


# Additional processors for other extensions
def process_code_block(config, shared_config):
    """Process CodeBlock extension configuration."""
    # Prepare tags and attributes
    tags = ["pre", "code"]
    attributes = {}

    # Include language attribute if supported
    if isinstance(config, dict) and config.get("languageClassPrefix"):
        attributes["pre"] = ["class"]
        attributes["code"] = ["class"]

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


def process_figure(config, shared_config):
    """Process Figure extension configuration."""
    # Prepare tags and attributes
    tags = ["figure", "figcaption", "img"]
    attributes = {
        "img": ["src", "alt", "width", "height"],
        "figure": ["class"],
    }

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


def process_image(config, shared_config):
    """Process Image extension configuration."""
    # Prepare tags and attributes
    tags = ["img"]
    attributes = {
        "img": ["src", "alt", "width", "height"],
    }

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


def process_text_align(config, shared_config):
    """Process TextAlign extension configuration."""
    # Text align typically uses classes, not new tags
    tags = []
    # Text align adds style and class attributes to various elements
    attributes = {
        "p": ["style", "class"],
        "h1": ["style", "class"],
        "h2": ["style", "class"],
        "h3": ["style", "class"],
        "h4": ["style", "class"],
        "h5": ["style", "class"],
        "h6": ["style", "class"],
        "blockquote": ["style", "class"],
    }

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


def process_color_highlight(config, shared_config):
    """Process Color and Highlight extension configuration."""
    # Prepare tags and attributes
    tags = ["span"]
    attributes = {
        "span": ["style", "class"],
    }

    # Add tags and attributes to the shared config
    add_tags_and_attributes(shared_config, tags, attributes)


def process_node_class(config, shared_config):
    """Process NodeClass extension configuration."""
    if not isinstance(config, dict) or "cssClasses" not in config:
        return

    css_classes = config["cssClasses"]
    if not isinstance(css_classes, dict):
        return

    # Map of node types to their HTML tags that need class attributes
    node_type_tags = {
        "paragraph": ["p"],
        "heading": ["h1", "h2", "h3", "h4", "h5", "h6"],
        "table": ["table"],
        "tableRow": ["tr"],
        "tableCell": ["td", "th"],
        "tableHeader": ["th"],
        "listItem": ["li"],
        "bulletList": ["ul"],
        "orderedList": ["ol"],
        "blockquote": ["blockquote"],
        "codeBlock": ["pre"],
    }

    # Collect all tags that need class attributes
    tags_needing_class = set()

    for node_type, classes in css_classes.items():
        if node_type in node_type_tags and classes:
            tags_needing_class.update(node_type_tags[node_type])

    # Add class attribute to all relevant tags
    if tags_needing_class:
        attributes = {tag: ["class"] for tag in tags_needing_class}
        add_tags_and_attributes(shared_config, [], attributes)


# Default extension mapping with processors as the single source of truth
EXTENSION_MAPPING = {
    # Core formatting
    "Bold": html_tags(["strong"]),
    "Italic": html_tags(["em"]),
    "Strike": html_tags(["s"]),
    "Underline": html_tags(["u"]),
    "Subscript": html_tags(["sub"]),
    "Superscript": html_tags(["sup"]),
    # Code extensions
    "Code": html_tags(["code"]),
    "CodeBlock": process_code_block,
    # Text styling
    "Color": process_color_highlight,
    "Highlight": process_color_highlight,
    "TextAlign": process_text_align,
    "TextStyle": process_color_highlight,
    # Structure
    "Heading": process_heading,
    "Paragraph": html_tags(["p"]),
    "HardBreak": html_tags(["br"]),
    "BulletList": html_tags(["ul"]),
    "OrderedList": html_tags(["ol"], {"ol": ["start", "type", "data-type"]}),
    "ListItem": html_tags(["li"]),
    "Blockquote": html_tags(["blockquote"]),
    "HorizontalRule": html_tags(["hr"]),
    # Media and figures
    "Image": process_image,
    "Figure": process_figure,
    "Caption": html_tags(["figcaption"]),
    # Advanced extensions
    "Link": process_link,
    "Table": html_tags(
        ["table", "tbody", "thead", "tr", "th", "td"],
        {
            "th": ["rowspan", "colspan"],
            "td": ["rowspan", "colspan"],
        },
    ),
    "TableRow": html_tags([]),
    "TableHeader": html_tags([]),
    "TableCell": html_tags([]),
    # Special extensions (these don't produce HTML elements)
    "History": html_tags([]),
    "HTML": html_tags([]),
    "Typographic": html_tags([]),
    "Document": html_tags([]),
    "Text": html_tags([]),
    "Dropcursor": html_tags([]),
    "Gapcursor": html_tags([]),
    "Menu": html_tags([]),
    "NoSpellCheck": html_tags([]),
    "NodeClass": process_node_class,
    "TextClass": html_tags(["span"], {"span": ["class"]}),
    "Placeholder": html_tags([]),
}

# DEPRECATED: This dictionary is no longer used for automatic dependency management
# but kept for backwards compatibility checking
LEGACY_EXTENSION_DEPENDENCIES = {
    "BulletList": ["ListItem"],
    "OrderedList": ["ListItem"],
    "Table": ["TableRow", "TableHeader", "TableCell"],
    "Figure": ["Caption", "Image"],
    "TextAlign": ["TextStyle"],
    "Color": ["TextStyle"],
    "Highlight": ["TextStyle"],
}


def expand_extensions(extensions: dict[str, Any]) -> dict[str, Any]:
    """
    Expand extension configuration by applying defaults.

    Args:
        extensions: Dictionary of extension configurations

    Returns:
        Expanded extension configuration
    """

    expanded = {
        # Core extensions
        "Document": True,
        "Dropcursor": True,
        "Gapcursor": True,
        "Paragraph": True,
        "Text": True,
        "Menu": {
            "groups": getattr(
                settings, "DJANGO_PROSE_EDITOR_MENU_GROUPS", DEFAULT_MENU_GROUPS
            )
        },
        "NoSpellCheck": True,
        # Enable history by default unless explicitly disabled
        "History": True,
    }

    # Include user-specified extensions
    expanded.update(extensions)

    # Filter out disabled extensions
    expanded = {
        extension: config
        for extension, config in expanded.items()
        if config is not False
    }

    # Check for legacy dependency issues and warn
    dependency_warnings = check_legacy_dependencies(extensions)
    for warning_msg in dependency_warnings:
        warnings.warn(
            warning_msg,
            UserWarning,
            stacklevel=3,  # Point to the calling code, not this function
        )

    return expanded


def check_legacy_dependencies(extensions: dict[str, Any]) -> list[str]:
    """
    Check if the extension configuration relies on legacy automatic dependency management.

    This function identifies configurations that would have worked with automatic
    dependency resolution but may now be incomplete.

    Args:
        extensions: Dictionary of extension configurations (raw, not expanded)

    Returns:
        List of warning messages about missing dependencies
    """
    warnings = []

    # Filter enabled extensions (don't call expand_extensions to avoid recursion)
    enabled_extensions = {
        extension: config
        for extension, config in extensions.items()
        if config is not False
    }

    for extension, deps in LEGACY_EXTENSION_DEPENDENCIES.items():
        if extension in enabled_extensions:
            for dep in deps:
                if dep not in enabled_extensions:
                    warnings.append(
                        f"Extension '{extension}' typically requires '{dep}' to function properly. "
                        f"Consider adding '{dep}': True to your configuration."
                    )

    return warnings


def js_from_extensions(
    extensions: dict[str, Any],
) -> list[str]:
    """
    Get JavaScript modules required by the enabled extensions.

    Args:
        extensions: Dictionary of extension configurations

    Returns:
        List of JavaScript module paths
    """
    expanded = set(expand_extensions(extensions))
    js_modules = set()

    extensions = getattr(settings, "DJANGO_PROSE_EDITOR_EXTENSIONS", [])
    for group in extensions:
        if (js := group.get("js")) and expanded & group["extensions"].keys():
            js_modules.update(js)

    return list(js_modules)


def allowlist_from_extensions(
    extensions: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate HTML sanitization config from extension configuration.

    This function collects configuration from all extension processors into a unified
    configuration dictionary suitable for nh3 HTML sanitization.

    Each processor function should accept two arguments:
    1. extension_config: The extension-specific configuration
    2. shared_config: The shared configuration dictionary to update

    Processors should directly modify the shared_config dictionary with their
    required HTML elements, attributes, and other nh3 parameters.

    Args:
        extensions: Dictionary of extension configurations

    Returns:
        Dictionary with sanitization config
    """
    expanded = expand_extensions(extensions)

    # Initialize the combined configuration with empty sets
    nh3_config = {
        "tags": set(),
        "attributes": {},
    }

    extensions = getattr(settings, "DJANGO_PROSE_EDITOR_EXTENSIONS", [])
    processors = EXTENSION_MAPPING.copy()
    for group in extensions:
        processors |= group["extensions"]

    for extension, config in expanded.items():
        processor = processors[extension]
        if isinstance(processor, str):
            processors[extension] = import_string(extension)
        processor(config, nh3_config)

    return nh3_config
