import os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
base_url = os.getenv('PREVIEW_BASE_URL', 'http://127.0.0.1:8765/docs/admin/previews')
widths = [280, 320, 360, 375, 390, 768, 1024, 1280, 1440]
pages = ['login', 'dashboard', 'businesses']
browser_path = os.getenv('PREVIEW_CHROME_PATH')

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=browser_path or None, channel=None if browser_path else 'chrome', args=['--no-sandbox'])
    for name in pages:
        for width in widths:
            page = browser.new_page(viewport={'width': width, 'height': 900}, device_scale_factor=1, reduced_motion='reduce')
            failures = []
            page.on('pageerror', lambda error: failures.append(str(error)))
            response = page.goto(f'{base_url}/{name}.html', wait_until='load', timeout=25000)
            assert response.status == 200, (name, width, response.status)
            page.evaluate('document.fonts.ready')
            measurements = page.evaluate('''() => ({
              documentWidth: document.documentElement.scrollWidth,
              viewport: window.innerWidth,
              heading: document.querySelector('h1')?.innerText,
              headingFont: getComputedStyle(document.querySelector('h1')).fontFamily,
              bodyFont: getComputedStyle(document.body).fontFamily,
              markedDemo: document.querySelector('.preview-strip')?.innerText.toLowerCase().includes('demonstration'),
              sheetPresent: [...document.styleSheets].some(s => s.href && s.href.includes('tokens.css'))
            })''')
            if measurements['documentWidth'] > width + 1:
                bad = page.evaluate("""() => [...document.querySelectorAll('*')].map(e => ({
                  tag: e.tagName, className: typeof e.className === 'string' ? e.className : '',
                  left: Math.round(e.getBoundingClientRect().left), right: Math.round(e.getBoundingClientRect().right),
                  width: Math.round(e.getBoundingClientRect().width)
                })).filter(x => x.right > window.innerWidth + 1 || x.left < -1).slice(0,20)""")
                print('OVERFLOW', name, width, bad, flush=True)
            assert measurements['documentWidth'] <= width + 1, (name, width, measurements)
            assert measurements['heading'], (name, width)
            assert measurements['markedDemo'] is True, (name, width)
            assert measurements['sheetPresent'] is True, (name, width)
            assert not failures, (name, width, failures)
            if width in (390, 1440):
                png = root / 'screenshots' / f'{name}-{width}.png'
                page.screenshot(path=str(png), full_page=True, animations='disabled')
                image = Image.open(png).convert('RGB')
                image.save(png.with_suffix('.webp'), quality=87, method=5)
                png.unlink()
            if width == 390 and name != 'login':
                button = page.get_by_role('button', name='Open navigation')
                button.click()
                assert button.get_attribute('aria-expanded') == 'true'
                page.keyboard.press('Escape')
                assert button.get_attribute('aria-expanded') == 'false'
            if name == 'businesses' and width == 390:
                page.get_by_role('searchbox', name='Search businesses').fill('Gadget')
                assert page.locator('tr[data-business-row]:visible').count() == 1
                page.get_by_role('searchbox', name='Search businesses').fill('')
                page.get_by_role('combobox', name='Filter businesses by status').select_option('Inactive')
                assert page.locator('tr[data-business-row]:visible').count() == 2
            if name == 'login' and width == 390:
                page.get_by_role('button', name='Sign in to workspace').click()
                assert 'Design preview only' in page.locator('#form-notice').inner_text()
                button = page.get_by_role('button', name='Show password')
                button.click()
                assert page.locator('#password').get_attribute('type') == 'text'
            print(f'PASS {name:10s} {width:4d}px · {measurements["headingFont"]}')
            page.close()
    browser.close()
