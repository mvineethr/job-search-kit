#!/usr/bin/env python3
"""
Render an ATS-safe resume HTML file to PDF.

Usage:
    python scripts/render_pdf.py path/to/resume.html [path/to/output.pdf]

If no output path is given, writes alongside the HTML with a .pdf extension.

Primary engine: WeasyPrint (pure-Python, produces a clean selectable text layer,
which is what ATS parsers need). Falls back to Playwright (headless Chromium) if
WeasyPrint isn't available.

Install one of:
    pip install weasyprint
    # or
    pip install playwright && playwright install chromium
"""
import sys
import os


def render_with_weasyprint(html_path: str, pdf_path: str) -> bool:
    try:
        from weasyprint import HTML
    except Exception:
        return False
    HTML(filename=html_path).write_pdf(pdf_path)
    return True


def render_with_playwright(html_path: str, pdf_path: str) -> bool:
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return False
    abs_html = "file://" + os.path.abspath(html_path)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(abs_html, wait_until="load")
        page.pdf(
            path=pdf_path,
            format="Letter",
            print_background=True,
            margin={"top": "0.5in", "bottom": "0.5in",
                    "left": "0.6in", "right": "0.6in"},
        )
        browser.close()
    return True


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    html_path = sys.argv[1]
    if not os.path.isfile(html_path):
        sys.exit(f"ERROR: HTML file not found: {html_path}")
    pdf_path = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(html_path)[0] + ".pdf"

    if render_with_weasyprint(html_path, pdf_path):
        engine = "WeasyPrint"
    elif render_with_playwright(html_path, pdf_path):
        engine = "Playwright/Chromium"
    else:
        sys.exit(
            "ERROR: No PDF engine available.\n"
            "Install one:\n"
            "  pip install weasyprint\n"
            "  pip install playwright && playwright install chromium"
        )

    print(f"OK: wrote {pdf_path} via {engine}")
    print("ATS check: open the PDF, select-all, copy into a text editor, "
          "and confirm the text order is correct and nothing is missing.")


if __name__ == "__main__":
    main()
