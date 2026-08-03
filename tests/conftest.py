import os

import pytest


@pytest.fixture
def browser_context_args(browser_context_args):
    """Modify browser context arguments for tracing."""
    return {
        **browser_context_args,
        "record_video_dir": os.path.join(os.getcwd(), "test-results/videos/"),
        "record_har_path": os.path.join(os.getcwd(), "test-results/har/", "test.har"),
    }


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Handle reporting and artifact generation."""
    outcome = yield
    report = outcome.get_result()

    # Take screenshot of failed tests
    if report.when == "call" and report.failed:
        try:
            page = item.funcargs["page"]
            # Take screenshot and save it with test name
            screenshot_dir = os.path.join(os.getcwd(), "test-results/screenshots/")
            os.makedirs(screenshot_dir, exist_ok=True)
            screenshot_path = os.path.join(screenshot_dir, f"{item.name}_failed.png")
            page.screenshot(path=screenshot_path)
            # Save page HTML
            html_path = os.path.join(screenshot_dir, f"{item.name}_failed.html")
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(page.content())

            # Add to report
            report.extra = [
                {
                    "name": "Screenshot",
                    "content": screenshot_path,
                    "mime_type": "image/png",
                },
                {"name": "HTML", "content": html_path, "mime_type": "text/html"},
            ]
        except Exception as e:  # noqa: BLE001
            print(f"Failed to capture artifacts: {e}")
