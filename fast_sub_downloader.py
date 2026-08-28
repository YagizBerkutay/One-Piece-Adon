import os
import sys
import time
import subprocess
import threading

sys.stdout.reconfigure(encoding='utf-8')

FOLDER_ID = "1bw9caXohzByPP5I0Nzi0PCniCmBUYA7e"
TARGET_DIR = r"c:\Users\berku\OneDrive\Desktop\one pace\One Pace Türkçe [Sadece Altyazı] [_17]"

stop_watcher = False

def video_cleaner_watcher():
    """Arka planda indirilen video/resim dosyalarını anında silerek disk/zaman tasarrufu sağlar"""
    print("🧹 Otomatik temizleyici başlatıldı (Sadece .ass altyazıları saklanacak)...")
    while not stop_watcher:
        try:
            for root, dirs, files in os.walk(TARGET_DIR):
                for f in files:
                    ext = os.path.splitext(f)[1].lower()
                    if ext in ['.mp4', '.mkv', '.avi', '.webp', '.png', '.jpg']:
                        file_path = os.path.join(root, f)
                        try:
                            os.remove(file_path)
                            print(f"🗑️ Video/Resim silindi (Altyazı değil): {f}")
                        except Exception:
                            pass
        except Exception:
            pass
        time.sleep(1)

# Temizleyici izleyiciyi başlat
watcher_thread = threading.Thread(target=video_cleaner_watcher, daemon=True)
watcher_thread.start()

# gdown klasör indirmesini çalıştır
print("🚀 Google Drive altyazı indirme işlemi başlatılıyor...")
cmd = ["gdown", "--folder", f"https://drive.google.com/drive/folders/{FOLDER_ID}", "-O", TARGET_DIR]
result = subprocess.run(cmd)

stop_watcher = True
print("✅ Tüm klasörler tarandı ve Türkçe altyazılar çekildi!")
