import os
from PIL import Image

image_dir = r"l:\bulblu\assets\images"
files = [
    'ref_video.jpg',
    'ref_ludo.jpg',
    'ref_truth.jpg',
    'ref_draw.jpg',
    'ref_jackaro.jpg',
    'ref_uno.jpg',
    'ref_singing.jpg',
    'ref_voice.jpg'
]

for filename in files:
    filepath = os.path.join(image_dir, filename)
    if os.path.exists(filepath):
        img = Image.open(filepath).convert("RGBA")
        datas = img.getdata()
        
        new_data = []
        for item in datas:
            # Check if pixel is near-white (background)
            if item[0] > 235 and item[1] > 235 and item[2] > 235:
                new_data.append((255, 255, 255, 0)) # Make transparent
            else:
                new_data.append(item)
                
        img.putdata(new_data)
        out_name = filename.replace("ref_", "clean_").replace(".jpg", ".png")
        out_path = os.path.join(image_dir, out_name)
        img.save(out_path, "PNG")
        print(f"Saved transparent PNG: {out_name}")

print("All card images processed to 100% transparent PNGs!")
