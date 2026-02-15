import csv
import os
import json

# Directory containing CSV files
CSV_DIR = "scrapeo/csv_outputs"

# Course code mapping from CSV filenames to database codes
# We need to map the curso_id in CSV (like 1101) to actual course codes in DB
COURSE_MAPPING = {
    # Based on filenames and existing course codes
    "SI205": "SI205",  # Algoritmia - multiple variants
    "ilide.info-silabo-de-calculo-diferencial": "BMA01",  # Cálculo Diferencial
    "BIC01": "BIC01",  # Introducción a Computación
    "BMA02": "BMA02",  # Cálculo Integral
    "BMA03": "BMA03",  # Álgebra Lineal
    "FB101": "FB101",  # Geometría Analítica
    "FB301": "FB301",  # Matemática Discreta
    "FB303": "FB303",  # Cálculo Multivariable
    "BQU01": "BQU01",  # Química I
    "BF101": "BFI01",  # Física I (note: BF101 -> BFI01)
}

def parse_topics(topics_str):
    """Convert topics string to array format for PostgreSQL"""
    # Topics come as {Topic1, Topic2, Topic3}
    if not topics_str or topics_str == '{}':
        return '{}'
    # Keep the format as is since it's already in PostgreSQL array format
    return topics_str

def extract_course_code_from_filename(filename):
    """Extract course code from CSV filename"""
    # Remove _learning_path.csv suffix
    base = filename.replace('_learning_path.csv', '')
    
    for key in COURSE_MAPPING:
        if key in base:
            return COURSE_MAPPING[key]
    
    return None

def generate_sql():
    sql_statements = []
    
    # Start transaction
    sql_statements.append("BEGIN;")
    sql_statements.append("")
    sql_statements.append("-- Clear existing learning path steps")
    sql_statements.append("DELETE FROM learning_path_steps;")
    sql_statements.append("")
    
    # Process each CSV file
    for filename in sorted(os.listdir(CSV_DIR)):
        if not filename.endswith('.csv'):
            continue
        
        course_code_base = extract_course_code_from_filename(filename)
        if not course_code_base:
            print(f"Warning: Could not map filename {filename}")
            continue
        
        filepath = os.path.join(CSV_DIR, filename)
        
        sql_statements.append(f"-- Processing {filename}")
        sql_statements.append(f"-- Course code: {course_code_base}")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                if not row.get('title'):  # Skip empty rows
                    continue
                
                title = row['title'].replace("'", "''")  # Escape single quotes
                description = row['description'].replace("'", "''")
                duration = row['duration']
                order_index = row['order_index']
                topics = parse_topics(row['topics'])
                icon = row['icon']
                
                # We need to insert for all variations (_SIS, _SOFT, _IND)
                # based on which courses exist in the database
                course_variants = [f"{course_code_base}_SIS", f"{course_code_base}_SOFT", f"{course_code_base}_IND"]
                
                for variant in course_variants:
                    sql = f"""INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon)
SELECT id, '{title}', '{description}', '{duration}', {order_index}, '{topics}', '{icon}'
FROM cursos 
WHERE code = '{variant}'
ON CONFLICT DO NOTHING;"""
                    sql_statements.append(sql)
        
        sql_statements.append("")
    
    sql_statements.append("COMMIT;")
    
    return "\n".join(sql_statements)

if __name__ == "__main__":
    sql = generate_sql()
    
    # Write to file
    output_file = "scripts/seed_learning_paths.sql"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(sql)
    
    print(f"SQL generated successfully: {output_file}")
    print(f"Total lines: {len(sql.splitlines())}")
