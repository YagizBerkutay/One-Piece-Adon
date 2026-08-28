import os
import re
import requests

# Clean script to scrape folder structure from Drive folder HTML
folder_url = "https://drive.google.com/drive/folders/1bw9caXohzByPP5I0Nzi0PCniCmBUYA7e"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

res = requests.get(folder_url, headers=headers)
print("Response status:", res.status_code)

# Search for file download links in the page
# Match pattern for Google Drive item entries: [id, title, mimeType]
matches = re.findall(r'\["([a-zA-Z0-9_-]{28,35})",\s*"([^"]+)"', res.text)

print(f"Bulunan nesneler ({len(matches)}):")
for item_id, name in matches[:20]:
    print(f"ID: {item_id} | Name: {name}")
