from django.apps import apps
from django.conf import settings
from django.core.checks import Error, Warning, register

from django_prose_editor.fields import ProseEditorField, _actually_empty


@register()
def check_js_preset_configuration(app_configs, **kwargs):
    """
    Check that the 'default' JavaScript preset is not being overridden in settings.
    """
    errors = []

    # Main setting
    if hasattr(settings, "DJANGO_PROSE_EDITOR_PRESETS"):
        presets = settings.DJANGO_PROSE_EDITOR_PRESETS
        if "default" in presets:
            errors.append(
                Error(
                    'Overriding the "default" preset in DJANGO_PROSE_EDITOR_PRESETS is not allowed.',
                    hint="Remove the 'default' key from your DJANGO_PROSE_EDITOR_PRESETS setting.",
                    obj=settings,
                    id="django_prose_editor.E001",
                )
            )

        if "configurable" in presets:
            errors.append(
                Error(
                    'Overriding the "configurable" preset in DJANGO_PROSE_EDITOR_PRESETS is not allowed.',
                    hint="Remove the 'configurable' key from your DJANGO_PROSE_EDITOR_PRESETS setting.",
                    obj=settings,
                    id="django_prose_editor.E002",
                )
            )

    return errors


@register()
def check_extensions_parameter(app_configs, **kwargs):
    """
    Check for usage of 'extensions' (because we want that!)
    """
    warnings = []

    # Get models to check based on provided app_configs or all models
    models_to_check = []
    if app_configs:
        for app_config in app_configs:
            models_to_check.extend(app_config.get_models())
    else:
        models_to_check = apps.get_models()

    # Check models for fields using deprecated config
    for model in models_to_check:
        for field in model._meta.fields:
            # Check if this field is using legacy config (no 'extensions' key)
            if isinstance(field, ProseEditorField) and (
                not isinstance(field.config, dict) or "extensions" not in field.config
            ):
                warnings.append(
                    Warning(
                        "This ProseEditorField is using the legacy configuration format which is "
                        "deprecated and will be removed in a future version. Add the 'extensions' "
                        "configuration explicitly to use the new configuration format.",
                        obj=f"{model._meta.label}.{field.name}",
                        id="django_prose_editor.W001",
                    )
                )

    return warnings


@register()
def check_custom_extensions_configuration(app_configs, **kwargs):
    """
    Check that custom extensions are properly configured.
    """
    errors = []

    # Check if custom extensions are defined
    if hasattr(settings, "DJANGO_PROSE_EDITOR_EXTENSIONS"):
        extensions = settings.DJANGO_PROSE_EDITOR_EXTENSIONS

        # Check that extensions is a list
        if not isinstance(extensions, list):
            errors.append(
                Error(
                    "DJANGO_PROSE_EDITOR_EXTENSIONS must be a list of dictionaries.",
                    hint="Configure DJANGO_PROSE_EDITOR_EXTENSIONS as a list of dictionaries, each with 'js' and 'extensions' keys.",
                    obj=settings,
                    id="django_prose_editor.E003",
                )
            )
            return errors

        # Check each extension group
        for i, extension_group in enumerate(extensions):
            if not isinstance(extension_group, dict):
                errors.append(
                    Error(
                        f"Extension group at index {i} must be a dictionary.",
                        hint="Each extension group must be a dictionary with 'js' and 'extensions' keys.",
                        obj=settings,
                        id="django_prose_editor.E004",
                    )
                )
                continue

            # Check that required keys are present
            if "extensions" not in extension_group:
                errors.append(
                    Error(
                        f"Extension group at index {i} is missing the required 'extensions' key.",
                        hint="Each extension group must have an 'extensions' key mapping extension names to processors.",
                        obj=settings,
                        id="django_prose_editor.E005",
                    )
                )
                continue

            if "js" not in extension_group:
                errors.append(
                    Warning(
                        f"Extension group at index {i} is missing the 'js' key.",
                        hint="Each extension group should have a 'js' key listing JavaScript assets for the extensions.",
                        obj=settings,
                        id="django_prose_editor.W002",
                    )
                )

            # Check the extensions dictionary
            extensions_dict = extension_group["extensions"]
            if not isinstance(extensions_dict, dict):
                errors.append(
                    Error(
                        f"The 'extensions' key in extension group at index {i} must be a dictionary.",
                        hint="The 'extensions' key should map extension names to processor callables or dotted paths.",
                        obj=settings,
                        id="django_prose_editor.E006",
                    )
                )
                continue

            # Check each processor
            for extension_name, processor in extensions_dict.items():
                # Check if the processor is a string (dotted path) or callable
                if not (callable(processor) or isinstance(processor, str)):
                    errors.append(
                        Error(
                            f'Processor for extension "{extension_name}" in group {i} must be a callable or a dotted path string.',
                            hint="Each processor must be either a callable or a dotted import path.",
                            obj=settings,
                            id="django_prose_editor.E007",
                        )
                    )

                # If it's a string, verify it looks like a dotted path
                if isinstance(processor, str) and "." not in processor:
                    errors.append(
                        Warning(
                            f'Processor path "{processor}" for extension "{extension_name}" in group {i} may not be a valid dotted import path.',
                            hint="The processor should be a dotted import path like 'myapp.processors.my_processor'.",
                            obj=settings,
                            id="django_prose_editor.W003",
                        )
                    )

            # Check the js assets list
            js_assets = extension_group.get("js", [])
            if not isinstance(js_assets, (list, tuple)):
                errors.append(
                    Error(
                        f"The 'js' key in extension group at index {i} must be a list.",
                        hint="The 'js' key should be a list of JavaScript asset URLs.",
                        obj=settings,
                        id="django_prose_editor.E008",
                    )
                )

    return errors


@register()
def check_sanitization_enabled(app_configs, **kwargs):
    """
    Check that all ProseEditorField instances have sanitization enabled.
    """
    warnings = []

    # Get models to check based on provided app_configs or all models
    models_to_check = []
    if app_configs:
        for app_config in app_configs:
            models_to_check.extend(app_config.get_models())
    else:
        models_to_check = apps.get_models()

    # Check all models for ProseEditorField without sanitization
    for model in models_to_check:
        for field in model._meta.fields:
            # Check if sanitization is disabled or set to the identity function
            if (
                isinstance(field, ProseEditorField)
                and field.sanitize == _actually_empty
            ):
                # Different messages based on whether using extensions or legacy config
                if isinstance(field.config, dict) and "extensions" in field.config:
                    message = (
                        "This ProseEditorField is using extensions without sanitization. "
                        "For security, it's recommended to enable sanitization with "
                        "sanitize=True when using extensions."
                    )
                    hint = (
                        "Add sanitize=True to this field definition for proper HTML sanitization "
                        "that matches your configured extensions."
                    )
                else:
                    message = (
                        "This ProseEditorField doesn't have sanitization enabled. "
                        "For security, it's recommended to enable sanitization."
                    )
                    hint = (
                        "Consider using the newer extensions mechanism with sanitize=True "
                        "for proper HTML sanitization that matches your editor capabilities."
                    )

                warnings.append(
                    Warning(
                        message,
                        hint=hint,
                        obj=f"{model._meta.label}.{field.name}",
                        id="django_prose_editor.W004",
                    )
                )

    return warnings
