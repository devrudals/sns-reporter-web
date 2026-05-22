import json
import os

transcript_path = r"C:\Users\user\.gemini\antigravity\brain\6912473c-d484-4ecb-9c0c-25d1f5a2db21\.system_generated\logs\transcript.jsonl"

last_valid_content = None

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data:
                for call in data['tool_calls']:
                    if call['name'] == 'write_to_file':
                        args = call.get('args', {})
                        if 'ContentsLayout.tsx' in args.get('TargetFile', ''):
                            content = args.get('CodeContent', '')
                            if 'modalOnly' in content and '비밀댓글' in content:
                                last_valid_content = content
        except Exception:
            pass

if last_valid_content:
    with open('recovered_ContentsLayout.tsx', 'w', encoding='utf-8') as f:
        f.write(last_valid_content)
    print("Found and recovered!")
else:
    print("Not found in write_to_file.")
