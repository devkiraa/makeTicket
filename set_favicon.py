from PIL import Image
import os
import shutil

def set_favicon():
    source_logo = 'google_app_logo_120x120.png'
    dest_dir = r'frontend/src/app'
    
    # 1. Convert to ICO and save as favicon.ico
    img = Image.open(source_logo)
    # ICO typically contains varying sizes. 
    # We'll include standard favicon sizes.
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    img.save(os.path.join(dest_dir, 'favicon.ico'), format='ICO', sizes=icon_sizes)
    print(f"✅ Created {os.path.join(dest_dir, 'favicon.ico')}")

    # 2. Save as icon.png (Next.js App Router support)
    # 120x120 is decent, but maybe we keep it as is.
    shutil.copy(source_logo, os.path.join(dest_dir, 'icon.png'))
    print(f"✅ Created {os.path.join(dest_dir, 'icon.png')}")

if __name__ == "__main__":
    if os.path.exists('google_app_logo_120x120.png'):
        set_favicon()
    else:
        print("❌ Source logo not found!")
