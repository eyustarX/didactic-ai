from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)
headers = {'X-Lecturer-Id': 'usr_31511ea6'}

# 1. Master Gradebook for All sections
res_all = client.get('/api/courses/master-gradebook?course_name=Computer%20Science%20101&section=All', headers=headers)
data_all = res_all.json()
print('=== Master Gradebook (All Sections) ===')
print('Assessments count:', len(data_all.get('assessments', [])))
for a in data_all.get('assessments', []):
    print(f"  - Assessment: {a['title']} | Category: {a['category']} | Max: {a['max_score']} pts | Weight: {a['weight_pct']}%")

print('Students count:', len(data_all.get('students', [])))
for s in data_all.get('students', []):
    print(f"  {s['student_name']} ({s['section']}) | Scores: {s['scores']} | Weighted Course %: {s['course_percentage']}% | Tier: {s['grade_tier']}")

# 2. Master Gradebook for Section A only
res_sec_a = client.get('/api/courses/master-gradebook?course_name=Computer%20Science%20101&section=Section%20A', headers=headers)
data_a = res_sec_a.json()
print('\n=== Master Gradebook (Section A Only) ===')
print('Assessments count:', len(data_a.get('assessments', [])))
print('Students count in Section A:', len(data_a.get('students', [])))
for s in data_a.get('students', []):
    print(f"  {s['student_name']} ({s['section']}) | Scores: {s['scores']} | Weighted Course %: {s['course_percentage']}% | Tier: {s['grade_tier']}")
