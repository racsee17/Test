import PyPDF2
import json
import os
import re

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF file"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
        return None

def parse_bloodwork_data(text, filename):
    """Parse bloodwork data from text"""
    import time
    import random
    data = {
        'filename': f'anonymized_{int(time.time())}_{random.randint(1000, 9999)}.pdf',
        'date': extract_date(text),
        'lab_number': extract_lab_number(text),
        'patient_info': extract_patient_info(text),
        'tests': {}
    }
    
    # Parse Chemistry section
    chemistry_tests = parse_chemistry_section(text)
    if chemistry_tests:
        data['tests']['Chemistry'] = chemistry_tests
    
    # Parse Lipid Profile
    lipid_tests = parse_lipid_section(text)
    if lipid_tests:
        data['tests']['Lipid Profile'] = lipid_tests
    
    # Parse Kidney Function
    kidney_tests = parse_kidney_section(text)
    if kidney_tests:
        data['tests']['Kidney Function'] = kidney_tests
    
    # Parse Liver Function
    liver_tests = parse_liver_section(text)
    if liver_tests:
        data['tests']['Liver Function'] = liver_tests
    
    # Parse Hematology
    hematology_tests = parse_hematology_section(text)
    if hematology_tests:
        data['tests']['Complete Blood Count'] = hematology_tests
    
    # Parse Differential Count
    differential_tests = parse_differential_section(text)
    if differential_tests:
        data['tests']['Differential Count'] = differential_tests
    
    # Parse Urinalysis
    urinalysis_tests = parse_urinalysis_section(text)
    if urinalysis_tests:
        data['tests']['Urinalysis'] = urinalysis_tests
    
    return data

def extract_date(text):
    match = re.search(r'Date Requested\s*:\s*(\d{2}-\d{2}-\d{4})', text)
    return match.group(1) if match else 'Unknown'

def extract_lab_number(text):
    match = re.search(r'Lab\. Number\s*:\s*(\d+)', text)
    return 'REDACTED' if match else 'Unknown'

def extract_patient_info(text):
    name_match = re.search(r'Name\s*:\s*([^\n]+)', text)
    age_match = re.search(r'Age\s*:\s*(\d+)', text)
    sex_match = re.search(r'Sex\s*:\s*(\w+)', text)
    
    return {
        'name': 'REDACTED',
        'age': age_match.group(1) if age_match else 'Unknown',
        'sex': sex_match.group(1) if sex_match else 'Unknown'
    }

def parse_chemistry_section(text):
    tests = []
    
    # FBS
    fbs_match = re.search(r'FBS.*?(\d+\.?\d*)\s*mg/dL\s*(\d+\.?\d*~\d+\.?\d*)', text, re.IGNORECASE)
    if fbs_match:
        value = float(fbs_match.group(1))
        range_parts = fbs_match.group(2).split('~')
        min_val, max_val = float(range_parts[0]), float(range_parts[1])
        status = get_status(value, min_val, max_val)
        
        tests.append({
            'name': 'FBS (Fasting Blood Sugar)',
            'value': fbs_match.group(1),
            'unit': 'mg/dL',
            'range': fbs_match.group(2),
            'status': status
        })
    
    return tests

def parse_lipid_section(text):
    tests = []
    
    lipid_patterns = [
        ('Total Cholesterol', r'Cholesterol.*?(\d+\.?\d*)\s*mg/dL.*?<\s*(\d+\.?\d*)'),
        ('Triglycerides', r'Triglycerides.*?(\d+\.?\d*)\s*mg/dL.*?<\s*(\d+\.?\d*)'),
        ('HDL Cholesterol', r'HDL.*?(\d+\.?\d*)\s*mg/dL.*?>\s*(\d+\.?\d*)'),
        ('LDL Cholesterol', r'LDL.*?(\d+\.?\d*)\s*mg/dL.*?<\s*(\d+\.?\d*)'),
        ('VLDL', r'VLDL.*?(\d+\.?\d*)\s*mg/dL'),
        ('CHOL/HDL Ratio', r'CHOL/HDL Ratio\s+(\d+\.?\d*).*?<\s*(\d+\.?\d*)')
    ]
    
    for name, pattern in lipid_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = float(match.group(1))
            
            if len(match.groups()) > 1:
                limit = float(match.group(2))
                if 'HDL' in name:
                    status = 'normal' if value >= limit else 'low'
                    range_str = f'> {match.group(2)}'
                else:
                    status = 'normal' if value <= limit else 'high'
                    range_str = f'< {match.group(2)}'
            else:
                status = 'normal'
                range_str = 'N/A'
            
            tests.append({
                'name': name,
                'value': match.group(1),
                'unit': 'mg/dL',
                'range': range_str,
                'status': status
            })
    
    return tests

def parse_kidney_section(text):
    tests = []
    
    kidney_patterns = [
        ('BUN (Blood Urea Nitrogen)', r'BUN.*?(\d+\.?\d*)\s*mg/dL\s*(\d+\.?\d*~\d+\.?\d*)'),
        ('Creatinine', r'Creatinine.*?(\d+\.?\d*)\s*mg/dL\s*(\d+\.?\d*~\d+\.?\d*)'),
        ('Uric Acid', r'Uric Acid.*?(\d+\.?\d*)\s*mg/dL\s*(\d+\.?\d*~\d+\.?\d*)')
    ]
    
    for name, pattern in kidney_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = float(match.group(1))
            range_parts = match.group(2).split('~')
            min_val, max_val = float(range_parts[0]), float(range_parts[1])
            status = get_status(value, min_val, max_val)
            
            tests.append({
                'name': name,
                'value': match.group(1),
                'unit': 'mg/dL',
                'range': match.group(2),
                'status': status
            })
    
    return tests

def parse_liver_section(text):
    tests = []
    
    liver_patterns = [
        ('SGPT/ALT', r'SGPT.*?ALT.*?(\d+\.?\d*)\s*U/L\s*(\d+\.?\d*~\d+\.?\d*)'),
        ('SGOT/AST', r'SGOT.*?AST.*?(\d+\.?\d*)\s*U/L\s*(\d+\.?\d*~\d+\.?\d*)'),
        ('ALP (Alkaline Phosphatase)', r'ALP.*?(\d+\.?\d*)\s*U/L\s*(\d+\.?\d*~\d+\.?\d*)')
    ]
    
    for name, pattern in liver_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = float(match.group(1))
            range_parts = match.group(2).split('~')
            min_val, max_val = float(range_parts[0]), float(range_parts[1])
            status = get_status(value, min_val, max_val)
            
            tests.append({
                'name': name,
                'value': match.group(1),
                'unit': 'U/L',
                'range': match.group(2),
                'status': status
            })
    
    return tests

def parse_hematology_section(text):
    tests = []
    
    hematology_patterns = [
        ('White Blood Cells', r'White Blood Cells.*?(\d+\.?\d*)\s*X10.*?(\d+\.?\d*~\d+\.?\d*)', 'X10³/mm³'),
        ('Red Blood Cells', r'Red Blood Cells.*?(\d+\.?\d*)\s*X10.*?(\d+\.?\d*~\d+\.?\d*)', 'X10⁶/mm³'),
        ('Hemoglobin', r'Hemoglobin.*?(\d+\.?\d*)\s*g/L.*?(\d+\.?\d*~\d+\.?\d*)', 'g/dL'),
        ('Hematocrit', r'Hematocrit.*?(\d+\.?\d*)\s*Vol\.Fraction.*?(\d+\.?\d*~\d+\.?\d*)', '%'),
        ('Mean Corpuscular Volume', r'Mean Corpuscular Volume.*?(\d+\.?\d*)\s*fL.*?(\d+\.?\d*~\d+\.?\d*)', 'fL'),
        ('Mean Corpuscular Hb', r'Mean Corpuscular Hb(?!\s*Conc).*?(\d+\.?\d*)\s*pg.*?(\d+\.?\d*~\d+\.?\d*)', 'pg'),
        ('Mean Corpuscular Hb Conc.', r'Mean Corpuscular Hb Conc.*?(\d+\.?\d*)\s*%.*?(\d+\.?\d*~\d+\.?\d*)', 'g/dL'),
        ('RBC Distribution Width', r'RBC Distribution Width.*?(\d+\.?\d*)\s*%.*?(\d+\.?\d*~\d+\.?\d*)', '%'),
        ('Platelet Count', r'Platelet Count.*?(\d+\.?\d*)\s*X10.*?(\d+\.?\d*~\d+\.?\d*)', 'X10³/mm³'),
        ('Mean Platelet Volume', r'Mean Platelet Volume.*?(\d+\.?\d*)\s*fL.*?(\d+\.?\d*~\d+\.?\d*)', 'fL')
    ]
    
    for name, pattern, unit in hematology_patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            value = float(match.group(1))
            range_parts = match.group(2).split('~')
            min_val, max_val = float(range_parts[0]), float(range_parts[1])
            status = get_status(value, min_val, max_val)
            
            tests.append({
                'name': name,
                'value': match.group(1),
                'unit': unit,
                'range': match.group(2),
                'status': status
            })
    
    return tests

def parse_differential_section(text):
    tests = []
    
    differential_patterns = [
        ('Neutrophils', r'Neutrophils.*?(\d+\.?\d*)\s*%.*?(\d+\.?\d*~\d+\.?\d*)'),
        ('Lymphocytes', r'Lymphocytes.*?(\d+\.?\d*)\s*%.*?(\d+\.?\d*~\d+\.?\d*)'),
        ('Monocyte', r'Monocyte.*?(\d+\.?\d*)\s*%.*?(\d+\.?\d*~\d+\.?\d*)'),
        ('Eosinophil', r'Eosinophil.*?(\d+\.?\d*)\s*%.*?(\d+\.?\d*~\d+\.?\d*)'),
        ('Basophil', r'Basophil.*?(\d+\.?\d*)\s*%.*?(\d+\.?\d*~\d+\.?\d*)')
    ]
    
    for name, pattern in differential_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = float(match.group(1))
            range_parts = match.group(2).split('~')
            min_val, max_val = float(range_parts[0]), float(range_parts[1])
            status = get_status(value, min_val, max_val)
            
            tests.append({
                'name': name,
                'value': match.group(1),
                'unit': '%',
                'range': match.group(2),
                'status': status
            })
    
    return tests

def parse_urinalysis_section(text):
    tests = []
    
    urine_tests = [
        'Sp. Gravity', 'pH', 'Protein', 'Glucose', 'Bilirubin', 
        'Blood (ERY/Hb)', 'Leukocytes', 'Nitrite', 'Urobilinogen', 'Ketone'
    ]
    
    for test_name in urine_tests:
        escaped_name = re.escape(test_name)
        pattern = rf'{escaped_name}\s+([\w\.]+|NEGATIVE|POSITIVE)(?:\s+([\d\.]+~[\d\.]+))?'
        match = re.search(pattern, text, re.IGNORECASE)
        
        if match:
            value = match.group(1)
            range_str = match.group(2) if match.group(2) else 'N/A'
            
            if value in ['NEGATIVE', 'POSITIVE']:
                status = 'normal' if value == 'NEGATIVE' else 'abnormal'
            else:
                status = 'normal'  # Assume normal for numeric values without range comparison
            
            tests.append({
                'name': test_name,
                'value': value,
                'unit': '',
                'range': range_str,
                'status': status
            })
    
    return tests

def get_status(value, min_val, max_val):
    """Determine if a value is normal, low, or high"""
    if value < min_val:
        return 'low'
    elif value > max_val:
        return 'high'
    else:
        return 'normal'

def main():
    # Get all PDF files in the current directory
    pdf_files = [f for f in os.listdir('.') if f.endswith('.pdf')]
    
    all_reports = []
    
    for pdf_file in pdf_files:
        print(f"Processing {pdf_file}...")
        text = extract_text_from_pdf(pdf_file)
        
        if text:
            report_data = parse_bloodwork_data(text, pdf_file)
            all_reports.append(report_data)
            print(f"Extracted {sum(len(tests) for tests in report_data['tests'].values())} tests from {pdf_file}")
        else:
            print(f"Failed to extract text from {pdf_file}")
    
    # Save to JSON file
    with open('bloodwork_data.json', 'w') as f:
        json.dump(all_reports, f, indent=2)
    
    print(f"\nProcessed {len(all_reports)} reports. Data saved to bloodwork_data.json")
    
    # Print summary
    for report in all_reports:
        print(f"\n{report['filename']} - {report['date']}:")
        for category, tests in report['tests'].items():
            print(f"  {category}: {len(tests)} tests")

if __name__ == "__main__":
    main()