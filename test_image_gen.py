from PIL import Image
import numpy as np

# Create a random RGB image (224x224)
arr = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
img = Image.fromarray(arr)
img.save('test_scan.png')
print("Created test_scan.png")
