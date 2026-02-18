import csv
import os

# Course ID mapping from Supabase
COURSE_ID_MAP = {
    # BFI01 (Física I)
    "BFI01_SIS": 26,
    "BFI01_SOFT": 41,
    "BFI01_IND": 64,
    # BIC01 (Intro a Computación)
    "BIC01_SIS": 14,
    "BIC01_SOFT": 36,
    "BIC01_IND": 59,
    # BMA01 (Cálculo Diferencial)
    "BMA01_SIS": 12,
    "BMA01_SOFT": 32,
    "BMA01_IND": 50,
    # BMA02 (Cálculo Integral)
    "BMA02_SIS": 18,
    "BMA02_SOFT": 39,
    "BMA02_IND": 58,
    # BMA03 (Álgebra Lineal)
    "BMA03_SIS": 17,
    "BMA03_SOFT": 38,
    "BMA03_IND": 57,
    # BQU01 (Química I)
    "BQU01_SIS": 13,
    "BQU01_SOFT": 33,
    "BQU01_IND": 51,
    # FB101 (Geometría Analítica)
    "FB101_SIS": 11,
    "FB101_SOFT": 31,
    "FB101_IND": 54,
    # FB301 (Matemática Discreta)
    "FB301_SIS": 24,
    "FB301_SOFT": 40,
    "FB301_IND": 66,
    # FB303 (Cálculo Multivariable)
    "FB303_SIS": 25,
    "FB303_SOFT": 44,
    "FB303_IND": 67,
    # SI205 (Algoritmia)
    "SI205_SIS": 23,
    "SI205_SOFT": 43,
}

# Mapping from filename patterns to course codes
FILE_TO_CODE = {
    "BF101-Fisica": "BFI01",
    "BIC01-Intro_Computacion": "BIC01",
    "ilide.info-silabo-de-calculo-diferencial": "BMA01",
    "BMA02-Integral": "BMA02",
    "BMA03-Lineal": "BMA03",
    "BQU01-Química_1": "BQU01",
    "FB101-Analítica": "FB101",
    "FB301-Discreta": "FB301",
    "FB303-Multivariable": "FB303",
    "SI205-Algorítmia-I2": "SI205",
}

def update_csv_with_real_ids(input_dir="scrapeo/csv_outputs"):
    """Update all CSV files with real Supabase course IDs"""
    
    for filename in os.listdir(input_dir):
        if not filename.endswith("_learning_path.csv"):
            continue
        
        # Find course code from filename
        course_code = None
        for pattern, code in FILE_TO_CODE.items():
            if pattern in filename:
                course_code = code
                break
        
        if not course_code:
            print(f"⚠️  Skipping {filename} - couldn't map to course code")
            continue
        
        input_path = os.path.join(input_dir, filename)
        
        # Read the CSV
        with open(input_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        
        if not rows:
            print(f"⚠️  Skipping {filename} - empty file")
            continue
        
        # Create 3 versions: SIS, SOFT, IND
        for suffix in ["SIS", "SOFT", "IND"]:
            course_key = f"{course_code}_{suffix}"
            
            if course_key not in COURSE_ID_MAP:
                print(f"⚠️  Skipping {course_key} - no ID mapping")
                continue
            
            curso_id = COURSE_ID_MAP[course_key]
            
            # Update all rows with the correct curso_id
            updated_rows = []
            for row in rows:
                new_row = row.copy()
                new_row['curso_id'] = curso_id
                updated_rows.append(new_row)
            
            # Write updated CSV
            output_filename = filename.replace("_learning_path.csv", f"_learning_path_{suffix}.csv")
            output_path = os.path.join(input_dir, output_filename)
            
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                if updated_rows:
                    writer = csv.DictWriter(f, fieldnames=updated_rows[0].keys())
                    writer.writeheader()
                    writer.writerows(updated_rows)
            
            print(f"✅ Created {output_filename} with curso_id={curso_id} ({len(updated_rows)} rows)")

if __name__ == "__main__":
    update_csv_with_real_ids()
    print("\n🎉 Done! All CSVs updated with real Supabase course IDs.")
    print("📁 Check scrapeo/csv_outputs/ for the updated *_SIS.csv, *_SOFT.csv, *_IND.csv files.")
