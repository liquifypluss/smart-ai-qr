from pathlib import Path
import cv2

expected = 'https://smartqr.liquifyplus.in/q/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef'
folder = Path('admin/test/screenshots')
for template in ('signature','minimal','business-branded'):
    file = folder / f'qr-{template}.webp'
    img = cv2.imread(str(file))
    assert img is not None, f'missing preview: {file}'
    value, corners, _ = cv2.QRCodeDetector().detectAndDecode(img)
    assert corners is not None and value == expected, f'{template}: QR did not decode to the expected public URL: {value!r}'
    print(f'{template} decoded correctly')
