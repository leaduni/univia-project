import re

# Read the full SQL file
with open("scripts/seed_learning_paths.sql", 'r', encoding='utf-8') as f:
    content = f.read()

# Split by course sections
sections = re.split(r'(-- Processing [^\n]+\n-- Course code: [^\n]+\n)', content)

# Reconstruct sections with headers
course_sections = []
for i in range(1, len(sections), 2):
    if i < len(sections):
        header = sections[i]
        body = sections[i+1] if i+1 < len(sections) else ""
        course_sections.append(header + body)

print(f"Total course sections: {len(course_sections)}")

# Write each section to a separate file
for idx, section in enumerate(course_sections):
    with open(f"scripts/seed_learning_paths_part{idx+1}.sql", 'w', encoding='utf-8') as f:
        f.write("-- Part {} of {}\n".format(idx+1, len(course_sections)))
        f.write(section)
    
    # Calculate size
    size_kb = len(section) / 1024
    print(f"Part {idx+1}: {size_kb:.2f} KB")

print("\nDone! Created {} SQL fragments.".format(len(course_sections)))
