"""Merge explicitly selected local service settings received on stdin; never print secrets."""
import json
import os
from pathlib import Path
import sys

path = Path(__file__).with_name('.env')
settings = dict(line.split('=', 1) for line in path.read_text().splitlines()
                if line and not line.startswith('#') and '=' in line)
payload = json.load(sys.stdin)
allowed = {'Ai', 'EmailSettings', 'Authentication', 'PayOS'}

def flatten(prefix, value):
    if isinstance(value, dict):
        for key, child in value.items():
            flatten(prefix + '__' + key, child)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            flatten(prefix + '__' + str(index), child)
    elif value is not None:
        settings[prefix] = str(value).lower() if isinstance(value, bool) else str(value)

for section, value in payload.items():
    if section not in allowed:
        raise ValueError('Unexpected settings section')
    flatten(section, value)

frontend = settings['FRONTEND_URL']
api = settings['API_PUBLIC_URL']
settings.update({
    'EmailSettings__ApiPublicUrl': api,
    'EmailSettings__FrontendUrl': frontend,
    'EmailSettings__ExposeDevTokens': 'false',
    'PayOS__ReturnUrl': frontend + '/billing-result?status=success',
    'PayOS__CancelUrl': frontend + '/billing-result?status=cancel',
    'PayOS__FrontendReturnUrl': frontend + '/billing-result',
})
def quote(value):
    # Compose single-quoted dotenv values do not interpolate dollar signs.
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"

temp = path.with_suffix('.env.tmp')
with temp.open('w', encoding='utf-8') as stream:
    os.chmod(temp, 0o600)
    for key, value in settings.items():
        if '\n' in value or '\r' in value:
            raise ValueError('Multiline setting is unsupported')
        stream.write(key + '=' + quote(value) + '\n')
temp.replace(path)
print('Service configuration imported without displaying secrets.')
