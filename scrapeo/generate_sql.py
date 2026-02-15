import csv
import os

csv_dir = "scrapeo/csv_outputs"
output_sql = "scrapeo/seed_learning_paths.sql"

def escape_sql(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"

def generate_sql():
    if not os.path.exists(csv_dir):
        print(f"Directory {csv_dir} does not exist.")
        return

    csv_files = [f for f in os.listdir(csv_dir) if f.endswith('.csv')]
    
    all_course_ids = set()
    inserts = []

    print(f"Found {len(csv_files)} CSV files.")

    for csv_file in csv_files:
        path = os.path.join(csv_dir, csv_file)
        with open(path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                curso_id = row['curso_id']
                all_course_ids.add(curso_id)
                
                title = escape_sql(row['title'])
                description = escape_sql(row['description'])
                duration = escape_sql(row['duration'])
                order_index = row['order_index']
                # Topics is already in {a,b,c} format in CSV, which matches Postgres array literal if passed as string
                topics = escape_sql(row['topics']) 
                icon = escape_sql(row['icon'])
                
                inserts.append(
                    f"({curso_id}, {title}, {description}, {duration}, {order_index}, {topics}, {icon})"
                )

    with open(output_sql, "w", encoding='utf-8') as out:
        out.write("-- Clean up existing paths for these courses\n")
        if all_course_ids:
            ids_str = ",".join(all_course_ids)
            out.write(f"DELETE FROM learning_path_steps WHERE curso_id IN ({ids_str});\n\n")
        
        out.write("-- Insert new paths\n")
        out.write("INSERT INTO learning_path_steps (curso_id, title, description, duration, order_index, topics, icon) VALUES\n")
        out.write(",\n".join(inserts))
        out.write(";\n")
    
    print(f"Generated SQL file: {output_sql} with {len(inserts)} rows.")

if __name__ == "__main__":
    generate_sql()
