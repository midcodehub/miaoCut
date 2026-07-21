import os
import re

CONFIG_REGEX = re.compile(
    r'<script>\s*window\.MIAOCUT_PRO_CONFIG = \{.*?\};\s*</script>',
    re.DOTALL
)

DYNAMIC_CONFIG = """<script>
        const isDev = window.location.hostname.includes('dev') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        window.MIAOCUT_PRO_CONFIG = isDev ? {
            SUPABASE_URL: "DEV_SUPABASE_URL_HERE", // Replace with Dev Supabase URL
            SUPABASE_ANON_KEY: "DEV_SUPABASE_ANON_KEY_HERE", // Replace with Dev Anon Key
            PRO_API_BASE: "https://dev-api.miaocut.app",
            FREE_API_BASE: "https://dev-api2.miaocut.app"
        } : {
            SUPABASE_URL: "https://kaqlfoxselrvriulvlsm.supabase.co",
            SUPABASE_ANON_KEY: "sb_publishable_MlDRXsrWyxijTUocv4Hq-g_PIi85ZQY",
            PRO_API_BASE: "https://pro-api.miaocut.app",
            FREE_API_BASE: "https://api2.miaocut.app"
        };
    </script>"""

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content, count = CONFIG_REGEX.subn(DYNAMIC_CONFIG, content)
    
    if count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('.'):
    # Skip node_modules, .git, etc
    if any(ignore in root for ignore in ['.git', 'node_modules', '.venv']):
        continue
    for file in files:
        if file.endswith('.html'):
            filepath = os.path.join(root, file)
            process_file(filepath)
