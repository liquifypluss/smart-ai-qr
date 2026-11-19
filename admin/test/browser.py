from pathlib import Path
import os
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:4174/'
API = 'https://admin-api.smartqr.liquifyplus.in'
OUT = Path('admin/test/screenshots')
OUT.mkdir(parents=True, exist_ok=True)
HEADERS = {
    'access-control-allow-origin': BASE.rstrip('/'),
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type,x-csrf-token',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'content-type': 'application/json',
}
SESSION = {'user': {'id': '00000000-0000-4000-8000-000000000001', 'email': 'operator@example.invalid', 'role': 'super_admin'}, 'csrfToken': 'x' * 43, 'expiresAt': '2099-01-01T00:00:00.000Z'}
OVERVIEW = {
    'metrics': {'totalBusinesses': 1, 'activeBusinesses': 1, 'totalLocations': 1, 'totalQrCodes': 0, 'activeQrCodes': 0},
    'recentBusinesses': [{'id': '00000000-0000-4000-8000-000000000002', 'name': 'Gadget Gallery', 'slug': 'gadget-gallery', 'category': 'electronics', 'status': 'active', 'createdAt': '2026-01-01T00:00:00.000Z'}],
    'recentActivity': [],
}

def intercept(route, ready):
    if route.request.method == 'OPTIONS':
        route.fulfill(status=204, headers=HEADERS)
    elif route.request.url.endswith('/auth/session'):
        route.fulfill(status=200 if ready else 401, headers=HEADERS, json=SESSION if ready else {'error': 'Unauthorized'})
    elif route.request.url.endswith('/auth/login'):
        route.fulfill(status=200, headers=HEADERS, json=SESSION)
    elif route.request.url.endswith('/auth/logout'):
        route.fulfill(status=200, headers=HEADERS, json={'status': 'ok'})
    elif route.request.url.endswith('/overview'):
        route.fulfill(status=200, headers=HEADERS, json=OVERVIEW)
    else:
        route.fulfill(status=404, headers=HEADERS, json={'error': 'Not found'})

def capture(page, name, width):
    page.add_style_tag(content="body::after{content:'TEST FIXTURE · NOT PRODUCTION';position:fixed;bottom:5px;right:5px;z-index:200;padding:4px 7px;color:#075985;background:#e0f2fe;border:1px solid #7dd3fc;font:600 10px Inter,sans-serif}")
    filename = OUT / f'{name}-{width}.png'
    page.screenshot(path=str(filename), full_page=True)
    Image.open(filename).convert('RGB').save(filename.with_suffix('.webp'), 'WEBP', quality=81, method=6)
    filename.unlink()

with sync_playwright() as p:
    binary = os.environ.get('PREVIEW_CHROME_PATH', '/usr/bin/google-chrome')
    browser = p.chromium.launch(executable_path=binary, headless=True, args=['--no-sandbox'])
    checks = 0
    for width in [280, 320, 360, 375, 390, 768, 1024, 1280, 1440]:
        page = browser.new_page(viewport={'width': width, 'height': 900}, device_scale_factor=1)
        page.route(f'{API}/**', lambda route: intercept(route, False))
        page.goto(BASE, wait_until='domcontentloaded')
        page.get_by_role('heading', name='Welcome back').wait_for()
        assert page.locator('#admin-password').get_attribute('autocomplete') == 'current-password'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), ('login overflow', width)
        page.get_by_role('button', name='Show password').click()
        assert page.locator('#admin-password').get_attribute('type') == 'text'
        if width in [390, 1440]: capture(page, 'login', width)
        checks += 1
        page.close()
        dashboard = browser.new_page(viewport={'width': width, 'height': 900}, device_scale_factor=1)
        dashboard.route(f'{API}/**', lambda route: intercept(route, True))
        dashboard.goto(BASE, wait_until='domcontentloaded')
        dashboard.get_by_role('heading', name='Overview').wait_for()
        dashboard.get_by_text('Total businesses').wait_for()
        assert dashboard.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), ('dashboard overflow', width)
        assert dashboard.get_by_text('Gadget Gallery').is_visible()
        assert dashboard.get_by_role('button', name='Businesses').is_disabled()
        if width <= 1023:
            trigger = dashboard.get_by_role('button', name='Open navigation')
            trigger.click()
            assert dashboard.locator('.sidebar').evaluate('(node)=>node.classList.contains("is-open")')
            dashboard.keyboard.press('Escape')
            assert not dashboard.locator('.sidebar').evaluate('(node)=>node.classList.contains("is-open")')
            assert trigger.evaluate('(node)=>document.activeElement===node')
        if width in [390, 1440]: capture(dashboard, 'dashboard', width)
        checks += 1
        dashboard.close()
    login = browser.new_page(viewport={'width': 390, 'height': 844})
    login.route(f'{API}/**', lambda route: intercept(route, False))
    login.goto(BASE)
    login.get_by_role('heading', name='Welcome back').wait_for()
    login.locator('#admin-email').fill('operator@example.invalid')
    login.locator('#admin-password').fill('SomeFakeBrowserFixturePassword')
    login.get_by_role('button', name='Sign in to workspace').click()
    login.get_by_role('heading', name='Overview').wait_for()
    login.get_by_role('button', name='Sign out').click()
    login.get_by_role('heading', name='Welcome back').wait_for()
    checks += 1
    login.close()
    browser.close()
    print(f'{checks} browser scenarios passed; 4 React screenshots rendered with fixture labels')
