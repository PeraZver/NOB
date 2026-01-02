/**
 * Test validation for division enrichment scripts
 */

const fs = require('fs');
const path = require('path');

console.log('Running validation tests...\n');

// Test 1: Check script files exist
console.log('Test 1: Checking script files...');
const scriptFiles = [
    'scripts/exportDivisions.js',
    'scripts/updateDivisionSites.js'
];

for (const file of scriptFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
        console.log(`  ✗ Missing: ${file}`);
        process.exit(1);
    }
    console.log(`  ✓ Found: ${file}`);
}

// Test 2: Check dependencies
console.log('\nTest 2: Checking dependencies...');
let pkg;
try {
    pkg = require('../package.json');
} catch (error) {
    console.log('  ✗ Failed to load package.json:', error.message);
    process.exit(1);
}
const required = ['axios', 'cheerio', 'dotenv', 'openai', 'mysql2'];
const missing = required.filter(dep => !pkg.dependencies[dep]);
if (missing.length > 0) {
    console.log('  ✗ Missing dependencies:', missing.join(', '));
    process.exit(1);
}
console.log('  ✓ All required dependencies present');

// Test 3: Validate sample JSON
console.log('\nTest 3: Validating sample JSON...');
const samplePath = path.join(__dirname, '..', 'divisions_data_sample.json');
if (!fs.existsSync(samplePath)) {
    console.log('  ✗ Sample JSON not found');
    process.exit(1);
}

const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
console.log(`  ✓ Sample JSON parsed successfully`);
console.log(`  ✓ Contains ${sample.length} divisions`);

// Test 4: Check structure
console.log('\nTest 4: Checking JSON structure...');
const requiredFields = ['name', 'formation_date', 'wikipedia_url'];
for (const div of sample) {
    const hasFields = requiredFields.every(field => field in div);
    if (!hasFields) {
        console.log(`  ✗ Division missing required fields: ${div.name}`);
        process.exit(1);
    }
}
console.log('  ✓ All divisions have required fields');

// Test 5: Validate expected output format
console.log('\nTest 5: Validating output format...');
const expectedFormat = {
    name: 'string',
    formation_date: 'string',
    wikipedia_url: 'string'
};

for (const div of sample) {
    for (const [field, expectedType] of Object.entries(expectedFormat)) {
        const actualType = div[field] === null ? 'null' : typeof div[field];
        const validTypes = Array.isArray(expectedType) ? expectedType : [expectedType];
        
        if (!validTypes.includes(actualType)) {
            console.log(`  ✗ Field '${field}' in division '${div.name}' has wrong type: ${actualType} (expected: ${validTypes.join(' or ')})`);
            process.exit(1);
        }
    }
    
    // Validate formation_geo structure if present
    if ('formation_geo' in div && div.formation_geo !== null) {
        if (!div.formation_geo.latitude || !div.formation_geo.longitude) {
            console.log(`  ✗ Formation_geo must have latitude and longitude: ${div.name}`);
            process.exit(1);
        }
        if (typeof div.formation_geo.latitude !== 'number' || typeof div.formation_geo.longitude !== 'number') {
            console.log(`  ✗ Latitude and longitude must be numbers: ${div.name}`);
            process.exit(1);
        }
    }
}
console.log('  ✓ Output format is correct');

// Test 6: Check documentation
console.log('\nTest 6: Checking documentation...');
const docPath = path.join(__dirname, '..', 'docs', 'DIVISION_DATA_ENRICHMENT.md');
if (!fs.existsSync(docPath)) {
    console.log('  ✗ Documentation not found');
    process.exit(1);
}
console.log('  ✓ Documentation exists');

console.log('\n' + '='.repeat(50));
console.log('✓ All validation tests passed!');
console.log('='.repeat(50));
