import os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:4174/'
API = 'https://admin-api.smartqr.liquifyplus.in'
OUT = Path('admin/test/screenshots')
OUT.mkdir(parents=True, exist_ok=True)
HEADERS = {'access-control-allow-origin': BASE.rstrip('/'), 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type,x-csrf-token', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'content-type': 'application/json'}
BUSINESS = '00000000-0000-4000-8000-000000000002'
LIBRARY = '00000000-0000-4000-8000-000000000003'
QR = '00000000-0000-4000-8000-000000000004'
SESSION = {'user': {'id': '00000000-0000-4000-8000-000000000001', 'email': 'operator@example.invalid', 'role': 'super_admin'}, 'csrfToken': 'x' * 43, 'expiresAt': '2099-01-01T00:00:00.000Z'}
ROW = {'id': BUSINESS, 'name': 'Gadget Gallery', 'slug': 'gadget-gallery', 'category': 'electronics', 'status': 'active', 'primaryColor': '#0753dd', 'logoId': None, 'createdAt': '2026-01-01T00:00:00.000Z', 'locationCount': 1, 'qrCount': 1, 'libraries': 'Mobile Store Reviews'}
QRDATA = {'id': QR, 'publicId': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef', 'businessId': BUSINESS, 'locationId': None, 'label': 'Front counter', 'status': 'active', 'template': 'signature', 'createdAt': '2026-01-01T00:00:00.000Z'}
DETAIL = {'business': {**ROW, 'destinationUrl': None}, 'locations': [], 'choices': [], 'assets': [], 'qrCodes': [QRDATA], 'settings': {'id': 'settings', 'choiceTitle': 'Which brand?', 'languages': ['en','hi','hinglish']}, 'assignedLibraries': [{'id': LIBRARY, 'name': 'Mobile Store Reviews', 'slug': 'mobile-store-reviews', 'priority': 100, 'isDefault': True, 'status': 'active'}]}
LIB = {'id': LIBRARY, 'name': 'Mobile Store Reviews', 'slug': 'mobile-store-reviews', 'description': 'Example data', 'industry': 'electronics', 'status': 'active', 'businessCount': 1, 'phraseCount': 0, 'ownerBusinessId': None, 'createdAt': '2026-01-01T00:00:00.000Z'}
OVERVIEW = {'metrics': {'totalBusinesses': 1, 'activeBusinesses': 1, 'totalLocations': 1, 'totalQrCodes': 1, 'activeQrCodes': 1}, 'recentBusinesses': [ROW], 'recentActivity': []}

def intercept(route, ready):
    url = route.request.url
    method = route.request.method
    if method == 'OPTIONS': route.fulfill(status=204, headers=HEADERS); return
    if url.endswith('/auth/session'): route.fulfill(status=200 if ready else 401, headers=HEADERS, json=SESSION if ready else {'error':'Unauthorized'}); return
    if url.endswith('/auth/login'): route.fulfill(status=200, headers=HEADERS, json=SESSION); return
    if url.endswith('/auth/logout'): route.fulfill(status=200, headers=HEADERS, json={'status':'ok'}); return
    if url.endswith('/overview'): result = OVERVIEW
    elif '/businesses/' + BUSINESS + '/qr-codes/' in url: result = QRDATA
    elif url.endswith('/businesses/' + BUSINESS): result = DETAIL
    elif '/businesses?' in url or url.endswith('/businesses'): result = {'items':[ROW],'total':1,'page':1,'limit':25}
    elif url.endswith('/phrase-libraries/' + LIBRARY): result = {'library':LIB,'phrases':[],'businesses':[{'id':BUSINESS,'name':'Gadget Gallery','slug':'gadget-gallery','priority':100,'isDefault':True}]}
    elif '/phrase-libraries?' in url or url.endswith('/phrase-libraries'): result = {'items':[LIB],'total':1,'page':1,'limit':25}
    elif '/activity?' in url or url.endswith('/activity'): result = {'items':[],'total':0,'page':1,'limit':25}
    elif '/review-preview?' in url: result = {'text':'A sample deterministic preview', 'source':'deterministic'}
    else: route.fulfill(status=404, headers=HEADERS, json={'error':'Not found'}); return
    route.fulfill(status=200, headers=HEADERS, json=result)

def capture(page, name, width):
    page.add_style_tag(content="body::after{content:'TEST FIXTURE · NOT PRODUCTION';position:fixed;bottom:5px;right:5px;z-index:200;padding:4px 7px;color:#075985;background:#e0f2fe;border:1px solid #7dd3fc;font:600 10px Inter,sans-serif}")
    name = OUT / f'{name}-{width}.png'
    page.screenshot(path=str(name), full_page=True)
    Image.open(name).convert('RGB').save(name.with_suffix('.webp'), 'WEBP', quality=81, method=6)
    name.unlink()

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('PREVIEW_CHROME_PATH','/usr/bin/google-chrome'), headless=True, args=['--no-sandbox'])
    checks = 0
    for width in [280, 320, 360, 375, 390, 768, 1024, 1280, 1440]:
        login = browser.new_page(viewport={'width': width, 'height': 900})
        login.route(f'{API}/**', lambda route: intercept(route, False))
        login.goto(BASE, wait_until='domcontentloaded')
        login.get_by_role('heading', name='Welcome back').wait_for()
        assert login.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), ('login overflow', width)
        login.get_by_role('button', name='Show password').click()
        assert login.locator('#admin-password').get_attribute('type') == 'text'
        if width in [390,1440]: capture(login,'login',width)
        login.close()
        checks += 1
        page = browser.new_page(viewport={'width':width,'height':900})
        page.route(f'{API}/**', lambda route: intercept(route,True))
        page.goto(BASE, wait_until='domcontentloaded')
        page.get_by_role('heading', name='Overview').wait_for()
        page.get_by_text('Total businesses').wait_for()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), ('dashboard overflow', width)
        assert page.get_by_role('button', name='Businesses').count() == 1
        assert page.get_by_role('button', name='QR Codes').count() == 0
        assert page.get_by_text('Protected operator workspace').count() == 0
        if width <= 1023:
            trigger = page.get_by_role('button', name='Open navigation')
            trigger.click()
            assert page.locator('.sidebar').evaluate('(node) => node.classList.contains("is-open")')
            page.keyboard.press('Escape')
            assert not page.locator('.sidebar').evaluate('(node) => node.classList.contains("is-open")')
            assert trigger.evaluate('(node) => document.activeElement === node')
            trigger.click()
        if width in [390,1440]: capture(page,'dashboard',width)
        page.get_by_role('button', name='Businesses').click()
        page.get_by_role('heading', name='Businesses').wait_for()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), ('businesses overflow', width)
        page.get_by_role('button', name='Add business').wait_for()
        if width in [390,1440]: capture(page,'businesses',width)
        checks += 1
        page.close()
    detail = browser.new_page(viewport={'width':390,'height':900})
    detail.route(f'{API}/**', lambda route: intercept(route,True))
    detail.goto(BASE+'businesses/'+BUSINESS)
    detail.get_by_role('heading', name='Gadget Gallery').wait_for()
    detail.get_by_role('tab', name='QR Codes').click()
    detail.get_by_role('button', name='Preview').click()
    detail.get_by_role('group', name='Choose QR template').wait_for()
    svg = detail.locator('.branded-qr-svg')
    assert svg.get_attribute('viewBox') == '0 0 720 850'
    for label in ['Signature','Minimal','Business Branded']:
        detail.get_by_role('button', name=label, exact=False).click()
        svg.wait_for()
        path = OUT / f'qr-{label.lower().replace(" ","-")}.png'
        svg.screenshot(path=str(path))
        Image.open(path).convert('RGB').save(path.with_suffix('.webp'), 'WEBP', quality=90)
        path.unlink()
        checks += 1
    detail.close()
    login = browser.new_page(viewport={'width':390,'height':844})
    login.route(f'{API}/**', lambda route: intercept(route,False))
    login.goto(BASE)
    login.locator('#admin-email').fill('operator@example.invalid')
    login.locator('#admin-password').fill('BrowserFixtureStrongPassword')
    login.get_by_role('button', name='Sign in to workspace').click()
    login.get_by_role('heading', name='Overview').wait_for()
    login.get_by_role('button', name='Open navigation').click()
    login.locator('.mobile-logout').click()
    login.get_by_role('heading', name='Welcome back').wait_for()
    checks += 1
    login.close()
    browser.close()
    print(f'{checks} browser scenarios passed; 6 responsive React screenshots and 3 branded QR previews rendered')
