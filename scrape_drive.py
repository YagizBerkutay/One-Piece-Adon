import os
import sys
import requests
import re
import json

sys.stdout.reconfigure(encoding='utf-8')

TARGET_DIR = r"c:\Users\berku\OneDrive\Desktop\one pace\One Pace Türkçe [Sadece Altyazı] [_17]"

def get_folder_items(folder_id):
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    resp = requests.get(url)
    if resp.status_code != 200:
        return []
    
    # Simple regex to find file/folder entries in Google Drive HTML JS data
    # Format: [id, title, mimeType, ...]
    matches = re.findall(r'\["([a-zA-Z0-9_-]{25,})",\s*"([^"]+)"', resp.text)
    items = []
    seen = set()
    for item_id, name in matches:
        if item_id in seen:
            continue
        seen.add(item_id)
        # unescape unicode
        try:
            name = name.encode().decode('unicode-escape')
        except:
            pass
        items.append((item_id, name))
    return items

print("🔍 Google Drive taranıyor...")
items = get_folder_items("1bw9caXohzByPP5I0Nzi0PCniCmBUYA7e")
print(f"Toplam {len(items)} öge bulundu.")

ass_files = [item for item in items if item[1].endswith('.ass') or item[1].endswith('.srt')]
folders = [item for item in items if not item[1].endswith('.ass') and not item[1].endswith('.srt') and not item[1].endswith('.mkv') and not item[1].endswith('.mp4')]

print(f"Altyazı dosyası sayısı: {len(ass_files)}")
print(f"Alt klasör sayısı: {len(folders)}")

for item_id, name in ass_files:
    print(f" - {name} ({item_id})")
