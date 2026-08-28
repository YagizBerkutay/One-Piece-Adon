import requests
import json
import re

url = "https://drive.google.com/drive/u/0/folders/1bw9caXohzByPP5I0Nzi0PCniCmBUYA7e"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9"
}

r = requests.get(url, headers=headers)
print("Page length:", len(r.text))

# Search for any subtitle file names in the initial payload
subs = re.findall(r'[^"\']*TR[-_]subtitle[^"\']*', r.text, re.IGNORECASE)
print("Found subtitle strings in page:", len(subs), subs[:5])

# Find all file IDs and names in window._DRIVE_ivd or initial data
file_matches = re.findall(r'\["([a-zA-Z0-9_-]{28,35})",\["([^"]+)"', r.text)
print("File matches count:", len(file_matches))
for fid, fname in file_matches[:10]:
    print(fid, fname)
