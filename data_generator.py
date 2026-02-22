import os

os.makedirs('db', exist_ok=True)

# Schema: <id>, <name>, <who_am_i>, <what does slowing down mean to you?>
users = [
    ("user_1", "Sirius", "The brightest star in the night sky. I shine steady.", "Slowing down is not burning out before my time."),
    ("user_2", "Canopus", "Navigator of the southern seas. Constant and reliable.", "Slowing down means finding the true north instead of rushing blindly."),
    ("user_3", "Rigil Kentaurus", "A neighbor closely watching from afar.", "It means taking the time to notice the subtle orbit of those around you."),
    ("user_4", "Arcturus", "The bear watcher. Guardian of the northern herds.", "To slow down is to breathe deeply and let the universe unfold at its own pace."),
    ("user_5", "Vega", "A harp string vibrating in the summer triangle.", "Slowing down gives space for the music to be heard between the notes."),
    ("user_6", "Capella", "The little goat star, bright and golden.", "Slowing down is resting in the pasture without worrying about tomorrow's mountain."),
    ("user_7", "Rigel", "The blue supergiant marking the hunter's foot.", "Slowing down is knowing that even giants need a moment to stand still."),
    ("user_8", "Procyon", "The one who comes before the dog. A loyal herald.", "It means you don't always have to be the first to arrive."),
    ("user_9", "Achernar", "The end of the river.", "Slowing down is realizing that all rivers eventually reach a quiet ocean."),
    ("user_10", "Betelgeuse", "The red giant waiting for its grand finale.", "Slowing down is accepting that patience is better than an explosive reaction.")
]

# Write authors.md
authors_content = "\n".join([f"{uid} | {name} | {who} | {meaning}" for uid, name, who, meaning in users])
with open('db/authors.md', 'w') as f:
    f.write(authors_content)

# Write users and generate thoughts
thoughts_21 = []
for i, (uid, name, who, meaning) in enumerate(users):
    tid = f"t{i+1}"
    date = "2026-02-21"
    time = f"{20 + i}:{(i*7)%60:02d}" # Mock time: 20:00, 21:07, 22:14...
    
    # User file (Extended Profile)
    user_content = f"- name: {name}\n"
    user_content += f"- who_am_i: {who}\n"
    user_content += f"- meaning_of_slowness: {meaning}\n"
    user_content += "- thoughts:\n"
    user_content += f"- {tid} | {date}\n"
    
    with open(f'db/{uid}.md', 'w') as f:
        f.write(user_content)
        
    # Thought file entries (plain text metadata format requested by user)
    thought_content = f"- thought: Taking back control. My name is {name}, and this is my first transparent thought.\n"
    thought_content += f"- thought_id: {tid}\n"
    thought_content += f"- author_id: {uid}\n"
    thought_content += f"- time: {time}\n"
    thought_content += f"- stars: {i * 2 + 1}\n"
    thoughts_21.append(thought_content)

# Write thoughts
with open('db/thoughts_2026-02-21.md', 'w') as f:
    f.write("\n".join(thoughts_21))

print("Mock data generated successfully.")
