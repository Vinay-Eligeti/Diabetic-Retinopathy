import requests

url = 'http://localhost:8000/predict'
files = {'file': ('test_scan.png', open('test_scan.png', 'rb'), 'image/png')}

try:
    response = requests.post(url, files=files)
    print(f"Status Code: {response.status_code}")
    print("Response JSON:", response.json())
except Exception as e:
    print(f"Error: {e}")
