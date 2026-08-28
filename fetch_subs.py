import sys
import subprocess

sys.stdout.reconfigure(encoding='utf-8')

FOLDER_ID = "1bw9caXohzByPP5I0Nzi0PCniCmBUYA7e"
TARGET_DIR = r"c:\Users\berku\OneDrive\Desktop\one pace\One Pace Türkçe [Sadece Altyazı] [_17]"

print("Google Drive klasörü taranıyor ve indirme başlatılıyor...")

cmd = ["gdown", "--folder", f"https://drive.google.com/drive/folders/{FOLDER_ID}", "-O", TARGET_DIR]
subprocess.run(cmd)
