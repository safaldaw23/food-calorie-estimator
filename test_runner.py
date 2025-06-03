#!/usr/bin/env python3
"""
Comprehensive Test Runner for Food Calorie Estimator
Runs backend (Python/pytest) and frontend (JavaScript/Jest) tests with coverage
"""

import subprocess
import sys
import os
import json
import argparse
from datetime import datetime
from pathlib import Path

class TestRunner:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'backend': {},
            'frontend': {},
            'integration': {},
            'overall': {}
        }
    
    def run_command(self, command, cwd=None, capture_output=True):
        """Run a shell command and return the result"""
        try:
            result = subprocess.run(
                command, 
                shell=True, 
                cwd=cwd or self.project_root,
                capture_output=capture_output,
                text=True,
                timeout=300  # 5 minute timeout
            )
            return result
        except subprocess.TimeoutExpired:
            print(f"⏰ Command timed out: {command}")
            return None
        except Exception as e:
            print(f"❌ Error running command: {command}")
            print(f"   Error: {str(e)}")
            return None
    
    def check_dependencies(self):
        """Check if required dependencies are installed"""
        print("🔍 Checking dependencies...")
        
        # Check Python dependencies
        if not (self.backend_dir / "requirements-test.txt").exists():
            print("⚠️  requirements-test.txt not found, creating...")
            self.create_test_requirements()
        
        # Install Python test dependencies
        print("📦 Installing Python test dependencies...")
        result = self.run_command(
            f"pip install -r {self.backend_dir}/requirements-test.txt",
            capture_output=False
        )
        
        # Check if npm/node is available for frontend tests
        node_check = self.run_command("node --version")
        if node_check and node_check.returncode == 0:
            print(f"✅ Node.js: {node_check.stdout.strip()}")
        else:
            print("⚠️  Node.js not found, skipping frontend tests")
            return False
        
        return True
    
    def create_test_requirements(self):
        """Create requirements-test.txt if it doesn't exist"""
        requirements = [
            "pytest==7.4.3",
            "pytest-cov==4.1.0", 
            "pytest-mock==3.12.0",
            "requests==2.31.0",
            "requests-mock==1.11.0",
            "coverage==7.3.2"
        ]
        
        with open(self.backend_dir / "requirements-test.txt", "w") as f:
            f.write("\n".join(requirements))
    
    def run_backend_tests(self, verbose=False):
        """Run Python/pytest tests for backend"""
        print("\n🐍 Running Backend Tests (Python/pytest)")
        print("=" * 50)
        
        if not self.backend_dir.exists():
            print("❌ Backend directory not found")
            return False
        
        # Prepare pytest command
        pytest_cmd = "python -m pytest"
        if verbose:
            pytest_cmd += " -v"
        
        # Add coverage options
        pytest_cmd += " --cov=. --cov-report=html:htmlcov --cov-report=term-missing --cov-report=xml"
        
        # Run tests
        result = self.run_command(pytest_cmd, cwd=self.backend_dir, capture_output=False)
        
        if result and result.returncode == 0:
            print("✅ Backend tests passed!")
            self.results['backend']['status'] = 'passed'
            
            # Try to parse coverage info
            try:
                coverage_file = self.backend_dir / "coverage.xml"
                if coverage_file.exists():
                    self.results['backend']['coverage_file'] = str(coverage_file)
            except Exception as e:
                print(f"⚠️  Could not parse coverage: {e}")
                
        else:
            print("❌ Backend tests failed!")
            self.results['backend']['status'] = 'failed'
            return False
        
        return True
    
    def run_frontend_tests(self, verbose=False):
        """Run JavaScript/Jest tests for frontend"""
        print("\n⚛️  Running Frontend Tests (JavaScript/Jest)")
        print("=" * 50)
        
        if not self.frontend_dir.exists():
            print("❌ Frontend directory not found")
            return False
        
        # Check if package.json exists
        package_json = self.frontend_dir / "package.json"
        if not package_json.exists():
            print("❌ package.json not found in frontend directory")
            return False
        
        # Install dependencies if node_modules doesn't exist
        if not (self.frontend_dir / "node_modules").exists():
            print("📦 Installing frontend dependencies...")
            install_result = self.run_command("npm install", cwd=self.frontend_dir, capture_output=False)
            if install_result and install_result.returncode != 0:
                print("❌ Failed to install frontend dependencies")
                return False
        
        # Run tests
        test_cmd = "npm run test:coverage"
        result = self.run_command(test_cmd, cwd=self.frontend_dir, capture_output=False)
        
        if result and result.returncode == 0:
            print("✅ Frontend tests passed!")
            self.results['frontend']['status'] = 'passed'
            
            # Check for coverage report
            coverage_dir = self.frontend_dir / "coverage"
            if coverage_dir.exists():
                self.results['frontend']['coverage_dir'] = str(coverage_dir)
        else:
            print("❌ Frontend tests failed or skipped!")
            self.results['frontend']['status'] = 'failed'
            return False
        
        return True
    
    def run_integration_tests(self, verbose=False):
        """Run integration tests"""
        print("\n🔗 Running Integration Tests")
        print("=" * 50)
        
        # Check if Docker containers are running
        docker_check = self.run_command("docker-compose ps")
        if docker_check and "Up" in docker_check.stdout:
            print("✅ Docker containers are running")
        else:
            print("⚠️  Docker containers not running, starting them...")
            start_result = self.run_command("docker-compose up -d", capture_output=False)
            if start_result and start_result.returncode != 0:
                print("❌ Failed to start Docker containers")
                return False
        
        # Run integration tests
        integration_cmd = "python -m pytest tests/integration/ -v"
        result = self.run_command(integration_cmd, cwd=self.backend_dir, capture_output=False)
        
        if result and result.returncode == 0:
            print("✅ Integration tests passed!")
            self.results['integration']['status'] = 'passed'
        else:
            print("❌ Integration tests failed!")
            self.results['integration']['status'] = 'failed'
            return False
        
        return True
    
    def run_api_tests(self):
        """Run API endpoint tests"""
        print("\n🌐 Running API Tests")
        print("=" * 50)
        
        # Test API endpoints
        api_tests = [
            ("Health Check", "curl -s http://localhost:9000/health"),
            ("History API", "curl -s http://localhost:9000/history"),
            ("Search API", "curl -s 'http://localhost:9000/api/predictions/search?query=pizza'"),
        ]
        
        api_results = []
        for test_name, command in api_tests:
            print(f"🧪 Testing {test_name}...")
            result = self.run_command(command)
            
            if result and result.returncode == 0:
                try:
                    # Try to parse JSON response
                    json.loads(result.stdout)
                    print(f"   ✅ {test_name}: Valid JSON response")
                    api_results.append(True)
                except json.JSONDecodeError:
                    print(f"   ⚠️  {test_name}: Non-JSON response")
                    api_results.append(False)
            else:
                print(f"   ❌ {test_name}: Failed")
                api_results.append(False)
        
        success_rate = sum(api_results) / len(api_results) if api_results else 0
        self.results['integration']['api_success_rate'] = success_rate
        
        return success_rate > 0.5  # Pass if more than 50% of tests pass
    
    def generate_report(self):
        """Generate a comprehensive test report"""
        print("\n📊 Test Report")
        print("=" * 50)
        
        backend_status = self.results.get('backend', {}).get('status', 'not_run')
        frontend_status = self.results.get('frontend', {}).get('status', 'not_run')
        integration_status = self.results.get('integration', {}).get('status', 'not_run')
        
        print(f"🐍 Backend Tests: {backend_status}")
        print(f"⚛️  Frontend Tests: {frontend_status}")
        print(f"🔗 Integration Tests: {integration_status}")
        
        # Overall status
        all_passed = all(status == 'passed' for status in [backend_status, frontend_status, integration_status])
        
        if all_passed:
            print("\n🎉 All tests passed!")
            self.results['overall']['status'] = 'passed'
        else:
            print("\n⚠️  Some tests failed")
            self.results['overall']['status'] = 'failed'
        
        # Save detailed results
        results_file = self.project_root / "test_results.json"
        with open(results_file, "w") as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: {results_file}")
        
        # Coverage information
        backend_coverage = self.backend_dir / "htmlcov" / "index.html"
        if backend_coverage.exists():
            print(f"📈 Backend coverage report: {backend_coverage}")
        
        frontend_coverage = self.frontend_dir / "coverage" / "lcov-report" / "index.html"
        if frontend_coverage.exists():
            print(f"📈 Frontend coverage report: {frontend_coverage}")
    
    def run_all_tests(self, verbose=False, skip_frontend=False, skip_integration=False):
        """Run all test suites"""
        print("🚀 Starting Comprehensive Test Suite")
        print("=" * 60)
        print(f"Timestamp: {self.results['timestamp']}")
        print(f"Project Root: {self.project_root}")
        
        # Check dependencies
        deps_ok = self.check_dependencies()
        if not deps_ok:
            print("❌ Dependency check failed")
            return False
        
        # Run backend tests
        backend_ok = self.run_backend_tests(verbose)
        
        # Run frontend tests (optional)
        frontend_ok = True
        if not skip_frontend:
            frontend_ok = self.run_frontend_tests(verbose)
        else:
            print("\n⏭️  Skipping frontend tests")
        
        # Run integration tests (optional)
        integration_ok = True
        if not skip_integration:
            integration_ok = self.run_integration_tests(verbose)
            api_ok = self.run_api_tests()
            integration_ok = integration_ok and api_ok
        else:
            print("\n⏭️  Skipping integration tests")
        
        # Generate report
        self.generate_report()
        
        return backend_ok and frontend_ok and integration_ok

def main():
    parser = argparse.ArgumentParser(description='Run comprehensive tests for Food Calorie Estimator')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--backend-only', action='store_true', help='Run only backend tests')
    parser.add_argument('--frontend-only', action='store_true', help='Run only frontend tests')
    parser.add_argument('--skip-integration', action='store_true', help='Skip integration tests')
    
    args = parser.parse_args()
    
    runner = TestRunner()
    
    if args.backend_only:
        success = runner.run_backend_tests(args.verbose)
    elif args.frontend_only:
        success = runner.run_frontend_tests(args.verbose)
    else:
        success = runner.run_all_tests(
            verbose=args.verbose,
            skip_frontend=False,
            skip_integration=args.skip_integration
        )
    
    runner.generate_report()
    
    if success:
        print("\n🎉 Test run completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Test run failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 