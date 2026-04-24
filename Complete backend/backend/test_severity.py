import sys
sys.path.insert(0, '.')
from routes.chatbot import assess_severity

tests = [
    ("i have a severe headache", "high"),
    ("i have a headache", "medium"),
    ("i have severe body ache", "medium"),
    ("i have body ache", "low"),
    ("i have a broken foot", "medium"),
    ("i have chest pain", "emergency"),
    ("my ankle twisted while playing", "medium"),
    ("i have a cold", "low"),
    ("severe cold", "medium"),
]

print("Severity Classification Tests:")
print("-" * 70)
all_pass = True
for text, expected in tests:
    result = assess_severity(text)
    got = result["urgency"]
    status = "PASS" if got == expected else "FAIL"
    if got != expected:
        all_pass = False
    print(f"  {status}  {text:45s} -> {got:10s} (expected {expected})")

print("-" * 70)
print("ALL TESTS PASSED!" if all_pass else "SOME TESTS FAILED!")
