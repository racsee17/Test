let bloodworkReports = [];
let allTests = new Set();
let testCategories = new Set();

function uploadFiles() {
    const fileInput = document.getElementById('fileInput');
    const files = fileInput.files;
    
    if (files.length === 0) {
        alert('Please select files to upload');
        return;
    }
    
    Array.from(files).forEach(file => {
        if (file.type === 'application/pdf') {
            parseTextFromFile(file);
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
            parseTextFile(file);
        }
    });
}

function parseTextFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const parsedData = parseBloodworkText(text, file.name);
        if (parsedData) {
            bloodworkReports.push(parsedData);
            updateFilters();
        }
    };
    reader.readAsText(file);
}

function parseTextFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const parsedData = parseBloodworkText(text, file.name);
        if (parsedData) {
            bloodworkReports.push(parsedData);
            updateFilters();
        }
    };
    reader.readAsText(file);
}

function parseBloodworkText(text, filename) {
    const report = {
        filename: filename,
        date: extractDate(text),
        labNumber: extractLabNumber(text),
        patientInfo: extractPatientInfo(text),
        tests: {}
    };
    
    // Parse Chemistry Panel
    const chemistrySection = extractSection(text, 'CHEMISTRY', 'Lipid Profile|CLINICAL MICROSCOPY|HEMATOLOGY');
    if (chemistrySection) {
        report.tests['Chemistry'] = parseChemistrySection(chemistrySection);
    }
    
    // Parse Lipid Profile
    const lipidSection = extractSection(text, 'Lipid Profile', 'BUN|CLINICAL MICROSCOPY|HEMATOLOGY');
    if (lipidSection) {
        report.tests['Lipid Profile'] = parseLipidSection(lipidSection);
    }
    
    // Parse Kidney Function
    const kidneySection = extractKidneyTests(text);
    if (kidneySection.length > 0) {
        report.tests['Kidney Function'] = kidneySection;
    }
    
    // Parse Liver Function
    const liverSection = extractLiverTests(text);
    if (liverSection.length > 0) {
        report.tests['Liver Function'] = liverSection;
    }
    
    // Parse Complete Blood Count
    const cbcSection = extractSection(text, 'Complete Blood Count', 'Differential Count');
    if (cbcSection) {
        report.tests['Complete Blood Count'] = parseCBCSection(cbcSection);
    }
    
    // Parse Differential Count
    const diffSection = extractSection(text, 'Differential Count', 'CLINICAL MICROSCOPY|DRUG TESTING|REGISTERED MEDICAL');
    if (diffSection) {
        report.tests['Differential Count'] = parseDifferentialSection(diffSection);
    }
    
    // Parse Urinalysis
    const urinalysisSection = extractSection(text, 'Urinalysis', 'DRUG TESTING|REGISTERED MEDICAL');
    if (urinalysisSection) {
        report.tests['Urinalysis'] = parseUrinalysisSection(urinalysisSection);
    }
    
    // Parse Drug Testing
    const drugSection = extractSection(text, 'DRUG TESTING', 'REGISTERED MEDICAL');
    if (drugSection) {
        report.tests['Drug Testing'] = parseDrugTestingSection(drugSection);
    }
    
    // Add tests to global sets for filtering
    Object.keys(report.tests).forEach(category => {
        testCategories.add(category);
        report.tests[category].forEach(test => {
            allTests.add(test.name);
        });
    });
    
    return report;
}

function extractDate(text) {
    const dateMatch = text.match(/Date Requested\s*:\s*(\d{2}-\d{2}-\d{4})/i);
    return dateMatch ? dateMatch[1] : 'Unknown';
}

function extractLabNumber(text) {
    const labMatch = text.match(/Lab\. Number\s*:\s*(\d+)/i);
    return labMatch ? labMatch[1] : 'Unknown';
}

function extractPatientInfo(text) {
    const nameMatch = text.match(/Name\s*:\s*([^\n]+)/i);
    const ageMatch = text.match(/Age\s*:\s*(\d+)/i);
    const sexMatch = text.match(/Sex\s*:\s*(\w+)/i);
    
    return {
        name: nameMatch ? nameMatch[1].trim() : 'Unknown',
        age: ageMatch ? ageMatch[1] : 'Unknown',
        sex: sexMatch ? sexMatch[1] : 'Unknown'
    };
}

function extractSection(text, startMarker, endMarker) {
    const startRegex = new RegExp(startMarker, 'i');
    const endRegex = new RegExp(endMarker, 'i');
    
    const startMatch = text.search(startRegex);
    if (startMatch === -1) return null;
    
    const endMatch = text.search(endRegex);
    const endIndex = endMatch === -1 ? text.length : endMatch;
    
    return text.substring(startMatch, endIndex);
}

function parseChemistrySection(text) {
    const tests = [];
    
    // FBS (Fasting Blood Sugar)
    const fbsMatch = text.match(/FBS.*?(\d+\.\d+)\s*mg\/dL\s*(\d+\.\d+~\d+\.\d+)/i);
    if (fbsMatch) {
        const value = parseFloat(fbsMatch[1]);
        const range = fbsMatch[2].split('~').map(v => parseFloat(v));
        tests.push({
            name: 'FBS (Fasting Blood Sugar)',
            value: fbsMatch[1],
            unit: 'mg/dL',
            range: fbsMatch[2],
            status: getValueStatus(value, range[0], range[1])
        });
    }
    
    return tests;
}

function parseLipidSection(text) {
    const tests = [];
    
    const lipidTests = [
        { name: 'Total Cholesterol', pattern: /Cholesterol.*?(\d+\.\d+)\s*mg\/dL.*?<\s*(\d+\.\d+)/ },
        { name: 'Triglycerides', pattern: /Triglycerides.*?(\d+\.\d+)\s*mg\/dL.*?<\s*(\d+\.\d+)/ },
        { name: 'HDL Cholesterol', pattern: /HDL.*?(\d+\.\d+)\s*mg\/dL.*?>\s*(\d+\.\d+)/ },
        { name: 'LDL Cholesterol', pattern: /LDL.*?(\d+\.\d+)\s*mg\/dL.*?<\s*(\d+\.\d+)/ },
        { name: 'VLDL', pattern: /VLDL.*?(\d+\.\d+)\s*mg\/dL/ },
        { name: 'CHOL/HDL Ratio', pattern: /CHOL\/HDL Ratio\s+(\d+\.\d+).*?<\s*(\d+\.\d+)/ }
    ];
    
    lipidTests.forEach(testPattern => {
        const match = text.match(testPattern.pattern);
        if (match) {
            const value = parseFloat(match[1]);
            let status = 'normal';
            let range = 'N/A';
            
            if (match[2]) {
                const limit = parseFloat(match[2]);
                if (testPattern.name === 'HDL Cholesterol') {
                    status = value >= limit ? 'normal' : 'low';
                    range = `> ${match[2]}`;
                } else {
                    status = value <= limit ? 'normal' : 'high';
                    range = `< ${match[2]}`;
                }
            }
            
            tests.push({
                name: testPattern.name,
                value: match[1],
                unit: 'mg/dL',
                range: range,
                status: status
            });
        }
    });
    
    return tests;
}

function extractKidneyTests(text) {
    const tests = [];
    
    // BUN
    const bunMatch = text.match(/BUN.*?(\d+\.\d+)\s*mg\/dL\s*(\d+\.\d+~\d+\.\d+)/i);
    if (bunMatch) {
        const value = parseFloat(bunMatch[1]);
        const range = bunMatch[2].split('~').map(v => parseFloat(v));
        tests.push({
            name: 'BUN (Blood Urea Nitrogen)',
            value: bunMatch[1],
            unit: 'mg/dL',
            range: bunMatch[2],
            status: getValueStatus(value, range[0], range[1])
        });
    }
    
    // Creatinine
    const creatMatch = text.match(/Creatinine.*?(\d+\.\d+)\s*mg\/dL\s*(\d+\.\d+~\d+\.\d+)/i);
    if (creatMatch) {
        const value = parseFloat(creatMatch[1]);
        const range = creatMatch[2].split('~').map(v => parseFloat(v));
        tests.push({
            name: 'Creatinine',
            value: creatMatch[1],
            unit: 'mg/dL',
            range: creatMatch[2],
            status: getValueStatus(value, range[0], range[1])
        });
    }
    
    // Uric Acid
    const uricMatch = text.match(/Uric Acid.*?(\d+\.\d+)\s*mg\/dL\s*(\d+\.\d+~\d+\.\d+)/i);
    if (uricMatch) {
        const value = parseFloat(uricMatch[1]);
        const range = uricMatch[2].split('~').map(v => parseFloat(v));
        tests.push({
            name: 'Uric Acid',
            value: uricMatch[1],
            unit: 'mg/dL',
            range: uricMatch[2],
            status: getValueStatus(value, range[0], range[1])
        });
    }
    
    return tests;
}

function extractLiverTests(text) {
    const tests = [];
    
    // SGPT/ALT
    const altMatch = text.match(/SGPT.*?ALT.*?(\d+\.\d+)\s*U\/L\s*(\d+\.\d+~\d+\.\d+)/i);
    if (altMatch) {
        const value = parseFloat(altMatch[1]);
        const range = altMatch[2].split('~').map(v => parseFloat(v));
        tests.push({
            name: 'SGPT/ALT',
            value: altMatch[1],
            unit: 'U/L',
            range: altMatch[2],
            status: getValueStatus(value, range[0], range[1])
        });
    }
    
    // SGOT/AST
    const astMatch = text.match(/SGOT.*?AST.*?(\d+\.\d+)\s*U\/L\s*(\d+\.\d+~\d+\.\d+)/i);
    if (astMatch) {
        const value = parseFloat(astMatch[1]);
        const range = astMatch[2].split('~').map(v => parseFloat(v));
        tests.push({
            name: 'SGOT/AST',
            value: astMatch[1],
            unit: 'U/L',
            range: astMatch[2],
            status: getValueStatus(value, range[0], range[1])
        });
    }
    
    // ALP
    const alpMatch = text.match(/ALP.*?(\d+\.\d+)\s*U\/L\s*(\d+\.\d+~\d+\.\d+)/i);
    if (alpMatch) {
        const value = parseFloat(alpMatch[1]);
        const range = alpMatch[2].split('~').map(v => parseFloat(v));
        tests.push({
            name: 'ALP (Alkaline Phosphatase)',
            value: alpMatch[1],
            unit: 'U/L',
            range: alpMatch[2],
            status: getValueStatus(value, range[0], range[1])
        });
    }
    
    return tests;
}

function parseCBCSection(text) {
    const tests = [];
    const lines = text.split('\n');
    
    const testPatterns = [
        { name: 'White Blood Cells', pattern: /White Blood Cells.*?(\d+\.?\d*)\s*X10\^?\d*\/?\w*\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'Red Blood Cells', pattern: /Red Blood Cells.*?(\d+\.?\d*)\s*X10\^?\d*\/?\w*\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'Hemoglobin', pattern: /Hemoglobin.*?(\d+\.?\d*)\s*g\/dL\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'Hematocrit', pattern: /Hematocrit.*?(\d+\.?\d*)\s*%?\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'Mean Corpuscular Volume', pattern: /Mean Corpuscular Volume.*?(\d+\.?\d*)\s*fL\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'Mean Corpuscular Hb', pattern: /Mean Corpuscular Hb(?!\s*Conc).*?(\d+\.?\d*)\s*pg\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'Mean Corpuscular Hb Conc.', pattern: /Mean Corpuscular Hb Conc.*?(\d+\.?\d*)\s*g\/dL\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'RBC Distribution Width', pattern: /RBC Distribution Width.*?(\d+\.?\d*)\s*%\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'Platelet Count', pattern: /Platelet Count.*?(\d+\.?\d*)\s*X10\^?\d*\/?\w*\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'Mean Platelet Volume', pattern: /Mean Platelet Volume.*?(\d+\.?\d*)\s*fL\s*(\d+\.?\d*~\d+\.?\d*)/ }
    ];
    
    testPatterns.forEach(testPattern => {
        const match = text.match(testPattern.pattern);
        if (match) {
            const value = parseFloat(match[1]);
            const range = match[2].split('~').map(v => parseFloat(v));
            const status = getValueStatus(value, range[0], range[1]);
            
            tests.push({
                name: testPattern.name,
                value: match[1],
                unit: getUnit(testPattern.name),
                range: match[2],
                status: status
            });
        }
    });
    
    return tests;
}

function parseDifferentialSection(text) {
    const tests = [];
    const testPatterns = [
        { name: 'Neutrophils', pattern: /Neutrophils.*?(\d+\.?\d*)\s*%\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'Lymphocytes', pattern: /Lymphocytes.*?(\d+\.?\d*)\s*%\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'Monocyte', pattern: /Monocyte.*?(\d+\.?\d*)\s*%\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'Eosinophil', pattern: /Eosinophil.*?(\d+\.?\d*)\s*%\s*(\d+\.?\d*~\d+\.?\d*)/ },
        { name: 'Basophil', pattern: /Basophil.*?(\d+\.?\d*)\s*%\s*(\d+\.?\d*~\d+\.?\d*)/ }
    ];
    
    testPatterns.forEach(testPattern => {
        const match = text.match(testPattern.pattern);
        if (match) {
            const value = parseFloat(match[1]);
            const range = match[2].split('~').map(v => parseFloat(v));
            const status = getValueStatus(value, range[0], range[1]);
            
            tests.push({
                name: testPattern.name,
                value: match[1],
                unit: '%',
                range: match[2],
                status: status
            });
        }
    });
    
    return tests;
}

function parseUrinalysisSection(text) {
    const tests = [];
    const lines = text.split('\n');
    
    const urineTests = [
        'Sp. Gravity', 'pH', 'Protein', 'Glucose', 'Bilirubin', 
        'Blood (ERY/Hb)', 'Leukocytes', 'Nitrite', 'Urobilinogen', 'Ketone'
    ];
    
    urineTests.forEach(testName => {
        const regex = new RegExp(`${testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(\\w+(?:\\.\\d+)?|NEGATIVE|POSITIVE)(?:\\s+(\\d+\\.\\d+~\\d+\\.\\d+))?`, 'i');
        const match = text.match(regex);
        
        if (match) {
            tests.push({
                name: testName,
                value: match[1],
                unit: getUrinalysisUnit(testName),
                range: match[2] || 'N/A',
                status: getUrinalysisStatus(match[1])
            });
        }
    });
    
    return tests;
}

function parseDrugTestingSection(text) {
    const tests = [];
    const testPatterns = [
        { name: 'MET/Shabu (IDTOMIS)', pattern: /MET\/Shabu.*?(NEGATIVE|POSITIVE)/ },
        { name: 'THC/Marijuana (IDTOMIS)', pattern: /THC\/Marijuana.*?(NEGATIVE|POSITIVE)/ }
    ];
    
    testPatterns.forEach(testPattern => {
        const match = text.match(testPattern.pattern);
        if (match) {
            tests.push({
                name: testPattern.name,
                value: match[1],
                unit: '',
                range: 'NEGATIVE',
                status: match[1] === 'NEGATIVE' ? 'normal' : 'abnormal'
            });
        }
    });
    
    return tests;
}

function getUnit(testName) {
    const units = {
        'White Blood Cells': 'X10³/mm³',
        'Red Blood Cells': 'X10⁶/mm³',
        'Hemoglobin': 'g/dL',
        'Hematocrit': '%',
        'Mean Corpuscular Volume': 'fL',
        'Mean Corpuscular Hb': 'pg',
        'Mean Corpuscular Hb Conc.': 'g/dL',
        'RBC Distribution Width': '%',
        'Platelet Count': 'X10³/mm³',
        'Mean Platelet Volume': 'fL'
    };
    return units[testName] || '';
}

function getUrinalysisUnit(testName) {
    if (testName === 'Sp. Gravity') return '';
    if (testName === 'pH') return '';
    return '';
}

function getValueStatus(value, min, max) {
    if (value < min) return 'low';
    if (value > max) return 'high';
    return 'normal';
}

function getUrinalysisStatus(value) {
    return value === 'NEGATIVE' ? 'normal' : 'abnormal';
}

function updateFilters() {
    const testFilter = document.getElementById('testFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    // Update test filter
    testFilter.innerHTML = '<option value="">All Tests</option>';
    Array.from(allTests).sort().forEach(test => {
        const option = document.createElement('option');
        option.value = test;
        option.textContent = test;
        testFilter.appendChild(option);
    });
    
    // Update category filter
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    Array.from(testCategories).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
    
    // Update displays
    updateTimeline();
    updateCondensedView();
    updateDetails();
}

function updateTimeline() {
    const container = document.getElementById('timelineContent');
    
    if (bloodworkReports.length === 0) {
        container.innerHTML = 'No bloodwork data loaded yet.';
        return;
    }
    
    // Sort reports by date
    const sortedReports = [...bloodworkReports].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let html = '<div class="timeline">';
    
    sortedReports.forEach((report, index) => {
        html += `
            <div class="timeline-item" onclick="showReportDetails('${index}')">
                <div class="timeline-date">${report.date}</div>
                <div class="timeline-content">
                    <h4>Lab #${report.labNumber}</h4>
                    <div class="timeline-summary">
                        ${Object.keys(report.tests).length} test categories, 
                        ${Object.values(report.tests).reduce((sum, tests) => sum + tests.length, 0)} total tests
                    </div>
                    <div class="timeline-highlights">
                        ${getAbnormalHighlights(report)}
                    </div>
                </div>
            </div>`;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function getAbnormalHighlights(report) {
    const abnormal = [];
    Object.values(report.tests).forEach(categoryTests => {
        categoryTests.forEach(test => {
            if (test.status !== 'normal') {
                abnormal.push(`${test.name}: ${test.value} ${test.unit} (${test.status})`);
            }
        });
    });
    
    if (abnormal.length === 0) {
        return '<span class="highlight-normal">All values normal</span>';
    }
    
    return abnormal.slice(0, 3).map(item => 
        `<span class="highlight-abnormal">${item}</span>`
    ).join('<br>') + (abnormal.length > 3 ? `<br><span class="highlight-more">+${abnormal.length - 3} more</span>` : '');
}

function updateDetails() {
    const container = document.getElementById('detailsContent');
    const testFilter = document.getElementById('testFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    if (bloodworkReports.length === 0) {
        container.innerHTML = 'Upload bloodwork files to see detailed results.';
        return;
    }
    
    let html = '<div class="details-grid">';
    
    // Get all unique test names
    const uniqueTests = new Set();
    bloodworkReports.forEach(report => {
        Object.values(report.tests).forEach(categoryTests => {
            categoryTests.forEach(test => {
                if (!testFilter || test.name === testFilter) {
                    uniqueTests.add(test.name);
                }
            });
        });
    });
    
    // Display each test across all reports
    Array.from(uniqueTests).sort().forEach(testName => {
        html += `<div class="test-history">`;
        html += `<h3>${testName}</h3>`;
        html += `<div class="test-timeline">`;
        
        bloodworkReports.forEach(report => {
            let foundTest = null;
            Object.values(report.tests).forEach(categoryTests => {
                const test = categoryTests.find(t => t.name === testName);
                if (test) foundTest = test;
            });
            
            if (foundTest) {
                const statusClass = `value-${foundTest.status}`;
                html += `
                    <div class="test-data-point">
                        <div class="test-date">${report.date}</div>
                        <div class="test-value ${statusClass}">${foundTest.value} ${foundTest.unit}</div>
                        <div class="test-range">${foundTest.range}</div>
                    </div>
                `;
            } else {
                html += `
                    <div class="test-data-point test-missing">
                        <div class="test-date">${report.date}</div>
                        <div class="test-value">N/A</div>
                        <div class="test-range">-</div>
                    </div>
                `;
            }
        });
        
        html += '</div></div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function filterTests() {
    updateCondensedView();
    updateDetails();
}

function showTrends() {
    const trendsContainer = document.getElementById('trendsContainer');
    const chartGrid = document.getElementById('chartGrid');
    
    if (trendsContainer.style.display === 'none') {
        trendsContainer.style.display = 'block';
        generateTrendCharts();
    } else {
        trendsContainer.style.display = 'none';
    }
}

function generateTrendCharts() {
    const chartGrid = document.getElementById('chartGrid');
    chartGrid.innerHTML = '';
    
    // Get numeric tests for trending
    const numericTests = new Map();
    
    bloodworkReports.forEach(report => {
        Object.values(report.tests).forEach(categoryTests => {
            categoryTests.forEach(test => {
                if (!isNaN(parseFloat(test.value))) {
                    if (!numericTests.has(test.name)) {
                        numericTests.set(test.name, []);
                    }
                    numericTests.get(test.name).push({
                        date: report.date,
                        value: parseFloat(test.value),
                        unit: test.unit,
                        status: test.status
                    });
                }
            });
        });
    });
    
    // Create charts for tests with multiple data points
    numericTests.forEach((data, testName) => {
        if (data.length > 1) {
            createTrendChart(testName, data, chartGrid);
        }
    });
}

function createTrendChart(testName, data, container) {
    const chartDiv = document.createElement('div');
    chartDiv.className = 'chart-container';
    chartDiv.innerHTML = `
        <canvas id="chart-${testName.replace(/[^a-zA-Z0-9]/g, '')}"></canvas>
        <h4>${testName}</h4>
    `;
    container.appendChild(chartDiv);
    
    const ctx = chartDiv.querySelector('canvas').getContext('2d');
    
    // Sort data by date
    data.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: `${testName} (${data[0].unit})`,
                data: data.map(d => d.value),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.1,
                pointBackgroundColor: data.map(d => {
                    switch(d.status) {
                        case 'high': return '#dc3545';
                        case 'low': return '#fd7e14';
                        default: return '#28a745';
                    }
                })
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function exportData() {
    const csvData = generateCSV();
    downloadCSV(csvData, 'bloodwork-history.csv');
}

function generateCSV() {
    const headers = ['Date', 'Lab Number', 'Test Category', 'Test Name', 'Value', 'Unit', 'Range', 'Status'];
    const rows = [headers];
    
    bloodworkReports.forEach(report => {
        Object.entries(report.tests).forEach(([category, tests]) => {
            tests.forEach(test => {
                rows.push([
                    report.date,
                    report.labNumber,
                    category,
                    test.name,
                    test.value,
                    test.unit,
                    test.range,
                    test.status
                ]);
            });
        });
    });
    
    return rows.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showReportDetails(reportIndex) {
    const report = bloodworkReports[reportIndex];
    if (!report) return;
    
    // Scroll to details section
    document.getElementById('detailsContent').scrollIntoView({ behavior: 'smooth' });
    
    // Filter to show this specific report's data
    updateDetails();
}

function showCondensedView(viewType) {
    // Update button states
    document.getElementById('tableViewBtn').classList.toggle('active', viewType === 'table');
    document.getElementById('cardsViewBtn').classList.toggle('active', viewType === 'cards');
    
    // Update view
    if (viewType === 'table') {
        updateCondensedTable();
    } else {
        updateCondensedCards();
    }
}

function updateCondensedView() {
    const tableBtn = document.getElementById('tableViewBtn');
    if (tableBtn && tableBtn.classList.contains('active')) {
        updateCondensedTable();
    } else {
        updateCondensedCards();
    }
}

function updateCondensedTable() {
    const container = document.getElementById('condensedContent');
    const testFilter = document.getElementById('testFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    if (bloodworkReports.length === 0) {
        container.innerHTML = 'Upload bloodwork files to see condensed results.';
        return;
    }
    
    // Get all unique tests that match filters
    const uniqueTests = new Map(); // test name -> {category, unit, ranges}
    
    bloodworkReports.forEach(report => {
        Object.entries(report.tests).forEach(([category, tests]) => {
            if (categoryFilter && category !== categoryFilter) return;
            
            tests.forEach(test => {
                if (testFilter && test.name !== testFilter) return;
                
                if (!uniqueTests.has(test.name)) {
                    uniqueTests.set(test.name, {
                        category: category,
                        unit: test.unit,
                        range: test.range
                    });
                }
            });
        });
    });
    
    if (uniqueTests.size === 0) {
        container.innerHTML = '<p>No tests match the selected filters.</p>';
        return;
    }
    
    // Create table
    let html = '<div class="table-wrapper"><table class="condensed-table">';
    
    // Header
    html += '<thead><tr>';
    html += '<th class="test-name">Test Name</th>';
    html += '<th>Unit</th>';
    html += '<th>Range</th>';
    
    bloodworkReports.forEach(report => {
        html += `<th>${report.date}<br><small>Lab #${report.labNumber}</small></th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    // Group by category
    const testsByCategory = new Map();
    uniqueTests.forEach((info, testName) => {
        if (!testsByCategory.has(info.category)) {
            testsByCategory.set(info.category, []);
        }
        testsByCategory.get(info.category).push({name: testName, ...info});
    });
    
    // Sort categories and tests
    Array.from(testsByCategory.keys()).sort().forEach(category => {
        const tests = testsByCategory.get(category).sort((a, b) => a.name.localeCompare(b.name));
        
        // Category header
        html += `<tr style="background: #667eea; color: white;"><td colspan="${3 + bloodworkReports.length}"><strong>${category}</strong></td></tr>`;
        
        tests.forEach((test, testIndex) => {
            const isEven = testIndex % 2 === 0;
            html += `<tr>`;
            html += `<td class="test-name ${isEven ? 'even' : ''}">${test.name}</td>`;
            html += `<td>${test.unit}</td>`;
            html += `<td style="font-size: 0.8rem;">${test.range}</td>`;
            
            bloodworkReports.forEach(report => {
                let foundTest = null;
                Object.values(report.tests).forEach(categoryTests => {
                    const t = categoryTests.find(t => t.name === test.name);
                    if (t) foundTest = t;
                });
                
                if (foundTest) {
                    const statusClass = `value-${foundTest.status}`;
                    html += `<td class="test-value ${statusClass}" title="${foundTest.status}">${foundTest.value}</td>`;
                } else {
                    html += `<td style="color: #ccc; font-style: italic;">N/A</td>`;
                }
            });
            
            html += '</tr>';
        });
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function updateCondensedCards() {
    const container = document.getElementById('condensedContent');
    const testFilter = document.getElementById('testFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    if (bloodworkReports.length === 0) {
        container.innerHTML = 'Upload bloodwork files to see condensed results.';
        return;
    }
    
    // Get all unique tests that match filters
    const uniqueTests = new Map();
    
    bloodworkReports.forEach(report => {
        Object.entries(report.tests).forEach(([category, tests]) => {
            if (categoryFilter && category !== categoryFilter) return;
            
            tests.forEach(test => {
                if (testFilter && test.name !== testFilter) return;
                
                if (!uniqueTests.has(test.name)) {
                    uniqueTests.set(test.name, {
                        category: category,
                        unit: test.unit,
                        range: test.range
                    });
                }
            });
        });
    });
    
    if (uniqueTests.size === 0) {
        container.innerHTML = '<p>No tests match the selected filters.</p>';
        return;
    }
    
    // Group by category
    const testsByCategory = new Map();
    uniqueTests.forEach((info, testName) => {
        if (!testsByCategory.has(info.category)) {
            testsByCategory.set(info.category, []);
        }
        testsByCategory.get(info.category).push({name: testName, ...info});
    });
    
    let html = '<div class="condensed-cards">';
    
    Array.from(testsByCategory.keys()).sort().forEach(category => {
        const tests = testsByCategory.get(category).sort((a, b) => a.name.localeCompare(b.name));
        
        html += `<div class="condensed-card">`;
        html += `<h3>${category}</h3>`;
        html += `<div class="condensed-card-content">`;
        
        tests.forEach(test => {
            html += `<div class="condensed-card-row">`;
            html += `<div class="condensed-card-test">${test.name}</div>`;
            html += `<div class="condensed-card-values">`;
            
            bloodworkReports.forEach((report, index) => {
                let foundTest = null;
                Object.values(report.tests).forEach(categoryTests => {
                    const t = categoryTests.find(t => t.name === test.name);
                    if (t) foundTest = t;
                });
                
                if (foundTest) {
                    const statusClass = `value-${foundTest.status}`;
                    html += `<div class="condensed-card-value ${statusClass}" title="${report.date} - ${foundTest.status}">${foundTest.value}</div>`;
                } else {
                    html += `<div class="condensed-card-value" style="color: #ccc; font-style: italic;">N/A</div>`;
                }
            });
            
            html += `</div></div>`;
        });
        
        html += `</div></div>`;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Initialize the app
window.onload = function() {
    // Load sample data
    loadSampleData();
};

async function loadSampleData() {
    try {
        const response = await fetch('complete_bloodwork_data.json');
        const data = await response.json();
        
        data.forEach(report => {
            // Add to global collections for filtering
            Object.keys(report.tests).forEach(category => {
                testCategories.add(category);
                report.tests[category].forEach(test => {
                    allTests.add(test.name);
                });
            });
            
            bloodworkReports.push(report);
        });
        
        updateFilters();
    } catch (error) {
        console.error('Error loading sample data:', error);
        updateFilters(); // Initialize with empty state
    }
}