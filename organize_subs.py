import os
import sys
import shutil
import json
import re

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"c:\Users\berku\OneDrive\Desktop\one pace\One Pace Türkçe [Sadece Altyazı] [_17]"

print("🔍 Tüm klasörlerdeki altyazılar taranıyor...")

ass_count = 0

for root, dirs, files in os.walk(BASE_DIR):
    if root == BASE_DIR:
        continue
    
    folder_name = os.path.basename(root)
    
    for f in files:
        if f.lower() in ["tr-subtitle.ass", "tr_subtitle.ass", "tr subtitle.ass"] or f.endswith(".ass"):
            if "EN-subtitle" in f or "EN_subtitle" in f:
                continue
            
            src_path = os.path.join(root, f)
            
            # Format new filename based on subfolder name
            clean_folder_name = re.sub(r'^[^\w]+', '', folder_name).strip()
            new_filename = f"{clean_folder_name} - TR.ass"
            # Sanitize filename
            new_filename = re.sub(r'[\\/*?:"<>|]', "", new_filename)
            dest_path = os.path.join(BASE_DIR, new_filename)
            
            shutil.copy2(src_path, dest_path)
            ass_count += 1
            print(f"  ✅ Taşındı: {clean_folder_name} -> {new_filename}")

print(f"\n🎉 Toplam {ass_count} yeni altyazı dosyası düzenlendi!")
