#!/bin/bash

# Test Runner Script
# Comprehensive testing automation for VuluGO

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
COVERAGE_DIR="$PROJECT_ROOT/coverage"

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Create directories
create_directories() {
    print_info "Creating test directories..."
    mkdir -p "$TEST_RESULTS_DIR"
    mkdir -p "$COVERAGE_DIR"
}

# Clean previous test results
clean_previous_results() {
    print_info "Cleaning previous test results..."
    rm -rf "$TEST_RESULTS_DIR"/*
    rm -rf "$COVERAGE_DIR"/*
}

# Check dependencies
check_dependencies() {
    print_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        print_error "package.json not found"
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    cd "$PROJECT_ROOT"
    npm ci --silent
    print_success "Dependencies installed"
}

# Run linting
run_linting() {
    print_header "Running ESLint"
    
    if npm run lint; then
        print_success "Linting passed"
    else
        print_error "Linting failed"
        return 1
    fi
}

# Run type checking
run_type_checking() {
    print_header "Running TypeScript Type Checking"
    
    if npm run type-check; then
        print_success "Type checking passed"
    else
        print_error "Type checking failed"
        return 1
    fi
}

# Run unit tests
run_unit_tests() {
    print_header "Running Unit Tests"
    
    if npm run test:unit -- --coverage --watchAll=false; then
        print_success "Unit tests passed"
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    print_header "Running Integration Tests"
    
    if npm run test:integration -- --coverage --watchAll=false; then
        print_success "Integration tests passed"
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Run e2e tests
run_e2e_tests() {
    print_header "Running End-to-End Tests"
    
    if npm run test:e2e -- --coverage --watchAll=false; then
        print_success "E2E tests passed"
    else
        print_error "E2E tests failed"
        return 1
    fi
}

# Run all tests
run_all_tests() {
    print_header "Running All Tests"
    
    if npm test -- --coverage --watchAll=false; then
        print_success "All tests passed"
    else
        print_error "Some tests failed"
        return 1
    fi
}

# Generate coverage report
generate_coverage_report() {
    print_header "Generating Coverage Report"
    
    if [ -d "$COVERAGE_DIR" ] && [ "$(ls -A $COVERAGE_DIR)" ]; then
        print_info "Coverage report generated at: $COVERAGE_DIR/lcov-report/index.html"
        
        # Calculate coverage summary
        if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
            node -e "
                const fs = require('fs');
                const coverage = JSON.parse(fs.readFileSync('$COVERAGE_DIR/coverage-summary.json', 'utf8'));
                const total = coverage.total;
                console.log('Coverage Summary:');
                console.log('  Lines: ' + total.lines.pct + '%');
                console.log('  Functions: ' + total.functions.pct + '%');
                console.log('  Branches: ' + total.branches.pct + '%');
                console.log('  Statements: ' + total.statements.pct + '%');
            "
        fi
        
        print_success "Coverage report generated"
    else
        print_warning "No coverage data found"
    fi
}

# Run security audit
run_security_audit() {
    print_header "Running Security Audit"
    
    if npm audit --audit-level=moderate; then
        print_success "Security audit passed"
    else
        print_warning "Security vulnerabilities found - check npm audit output"
    fi
}

# Performance tests
run_performance_tests() {
    print_header "Running Performance Tests"
    
    # Bundle size analysis
    if command -v bundlesize &> /dev/null; then
        if npm run bundlesize; then
            print_success "Bundle size check passed"
        else
            print_warning "Bundle size check failed"
        fi
    else
        print_info "bundlesize not installed, skipping bundle analysis"
    fi
}

# Generate test report
generate_test_report() {
    print_header "Generating Test Report"
    
    local report_file="$TEST_RESULTS_DIR/test-summary.md"
    
    cat > "$report_file" << EOF
# VuluGO Test Report

**Generated:** $(date)
**Environment:** $(node --version)

## Test Results

EOF
    
    if [ -f "$TEST_RESULTS_DIR/junit.xml" ]; then
        # Parse JUnit XML for test statistics
        local total_tests=$(grep -o 'tests="[0-9]*"' "$TEST_RESULTS_DIR/junit.xml" | grep -o '[0-9]*' | head -1)
        local failed_tests=$(grep -o 'failures="[0-9]*"' "$TEST_RESULTS_DIR/junit.xml" | grep -o '[0-9]*' | head -1)
        local error_tests=$(grep -o 'errors="[0-9]*"' "$TEST_RESULTS_DIR/junit.xml" | grep -o '[0-9]*' | head -1)
        
        cat >> "$report_file" << EOF
- **Total Tests:** ${total_tests:-0}
- **Failed Tests:** ${failed_tests:-0}
- **Error Tests:** ${error_tests:-0}
- **Success Rate:** $(( (${total_tests:-0} - ${failed_tests:-0} - ${error_tests:-0}) * 100 / ${total_tests:-1} ))%

EOF
    fi
    
    if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
        cat >> "$report_file" << EOF
## Coverage Summary

$(node -e "
    const fs = require('fs');
    const coverage = JSON.parse(fs.readFileSync('$COVERAGE_DIR/coverage-summary.json', 'utf8'));
    const total = coverage.total;
    console.log('- **Lines:** ' + total.lines.pct + '%');
    console.log('- **Functions:** ' + total.functions.pct + '%');
    console.log('- **Branches:** ' + total.branches.pct + '%');
    console.log('- **Statements:** ' + total.statements.pct + '%');
")

EOF
    fi
    
    cat >> "$report_file" << EOF
## Files

- [HTML Coverage Report](./coverage/lcov-report/index.html)
- [JUnit XML Report](./junit.xml)
- [HTML Test Report](./test-report.html)

---
*Generated by VuluGO test automation*
EOF
    
    print_success "Test report generated: $report_file"
}

# Main execution
main() {
    local test_type="${1:-all}"
    local exit_code=0
    
    print_header "VuluGO Test Runner"
    print_info "Test type: $test_type"
    print_info "Project root: $PROJECT_ROOT"
    
    # Setup
    create_directories
    clean_previous_results
    check_dependencies
    
    # Install dependencies if needed
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        install_dependencies
    fi
    
    # Run tests based on type
    case "$test_type" in
        "lint")
            run_linting || exit_code=1
            ;;
        "type-check")
            run_type_checking || exit_code=1
            ;;
        "unit")
            run_unit_tests || exit_code=1
            ;;
        "integration")
            run_integration_tests || exit_code=1
            ;;
        "e2e")
            run_e2e_tests || exit_code=1
            ;;
        "security")
            run_security_audit || exit_code=1
            ;;
        "performance")
            run_performance_tests || exit_code=1
            ;;
        "all")
            run_linting || exit_code=1
            run_type_checking || exit_code=1
            run_all_tests || exit_code=1
            run_security_audit || exit_code=1
            run_performance_tests || exit_code=1
            ;;
        *)
            print_error "Unknown test type: $test_type"
            print_info "Available types: lint, type-check, unit, integration, e2e, security, performance, all"
            exit 1
            ;;
    esac
    
    # Generate reports
    generate_coverage_report
    generate_test_report
    
    # Final status
    if [ $exit_code -eq 0 ]; then
        print_success "All tests completed successfully!"
    else
        print_error "Some tests failed. Check the output above."
    fi
    
    exit $exit_code
}

# Help function
show_help() {
    cat << EOF
VuluGO Test Runner

Usage: $0 [test_type]

Test Types:
  lint          Run ESLint
  type-check    Run TypeScript type checking
  unit          Run unit tests
  integration   Run integration tests
  e2e           Run end-to-end tests
  security      Run security audit
  performance   Run performance tests
  all           Run all tests (default)

Options:
  -h, --help    Show this help message

Examples:
  $0                    # Run all tests
  $0 unit              # Run only unit tests
  $0 lint              # Run only linting

EOF
}

# Handle command line arguments
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# Run main function
main "$@"
