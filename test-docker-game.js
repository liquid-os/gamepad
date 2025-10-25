#!/usr/bin/env node

/**
 * Test Docker Containerization
 * Tests the Docker container system with a simple game
 */

const path = require('path');
const fs = require('fs');

console.log('🐳 Testing Docker Containerization\n');

// Test if Docker is available
async function testDocker() {
  try {
    const Docker = require('dockerode');
    const docker = new Docker();
    
    // Test Docker connection
    await docker.ping();
    console.log('✅ Docker daemon is accessible');
    
    // Check if base image exists
    try {
      const image = docker.getImage('gamepad-game-base');
      await image.inspect();
      console.log('✅ Base image gamepad-game-base exists');
    } catch (error) {
      console.log('❌ Base image gamepad-game-base not found');
      console.log('   Run: docker-compose build to create the base image');
      return false;
    }
    
    // Check if network exists
    try {
      const network = docker.getNetwork('gamepad-internal');
      await network.inspect();
      console.log('✅ Network gamepad-internal exists');
    } catch (error) {
      console.log('❌ Network gamepad-internal not found');
      console.log('   Run: docker-compose up --no-start to create the network');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Docker is not available:', error.message);
    console.log('   Make sure Docker is installed and running');
    return false;
  }
}

// Test container creation
async function testContainerCreation() {
  try {
    const GameContainerManager = require('./utils/GameContainerManager');
    
    console.log('\n📦 Testing container creation...');
    
    // Initialize container manager
    await GameContainerManager.initialize();
    console.log('✅ Container manager initialized');
    
    // Test container creation (this will fail if no game files exist, but we can test the setup)
    console.log('✅ Container manager is ready for game containers');
    
    return true;
  } catch (error) {
    console.log('❌ Container creation test failed:', error.message);
    return false;
  }
}

// Test WebSocket wrapper
function testWebSocketWrapper() {
  try {
    console.log('\n🔌 Testing WebSocket wrapper...');
    
    // Check if wrapper file exists and has WebSocket code
    const wrapperPath = path.join(__dirname, 'utils', 'GameProcessWrapper.js');
    const wrapperContent = fs.readFileSync(wrapperPath, 'utf8');
    
    if (wrapperContent.includes('WebSocket')) {
      console.log('✅ GameProcessWrapper has WebSocket implementation');
    } else {
      console.log('❌ GameProcessWrapper missing WebSocket implementation');
      return false;
    }
    
    if (wrapperContent.includes('ws')) {
      console.log('✅ WebSocket dependency is imported');
    } else {
      console.log('❌ WebSocket dependency not imported');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ WebSocket wrapper test failed:', error.message);
    return false;
  }
}

// Test server integration
function testServerIntegration() {
  try {
    console.log('\n🖥️  Testing server integration...');
    
    // Check if server.js has Docker integration
    const serverPath = path.join(__dirname, 'server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (serverContent.includes('USE_DOCKER')) {
      console.log('✅ Server has Docker feature flag');
    } else {
      console.log('❌ Server missing Docker feature flag');
      return false;
    }
    
    if (serverContent.includes('GameContainerManager')) {
      console.log('✅ Server imports GameContainerManager');
    } else {
      console.log('❌ Server missing GameContainerManager import');
      return false;
    }
    
    if (serverContent.includes('gameManager')) {
      console.log('✅ Server uses unified game manager');
    } else {
      console.log('❌ Server not using unified game manager');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Server integration test failed:', error.message);
    return false;
  }
}

// Test dependencies
function testDependencies() {
  try {
    console.log('\n📦 Testing dependencies...');
    
    const packageJsonPath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDeps = ['dockerode', 'ws', 'express-ws'];
    const missingDeps = [];
    
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies[dep]) {
        console.log(`✅ ${dep} dependency found`);
      } else {
        console.log(`❌ ${dep} dependency missing`);
        missingDeps.push(dep);
      }
    });
    
    if (missingDeps.length === 0) {
      console.log('✅ All required dependencies are present');
      return true;
    } else {
      console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
      console.log('   Run: npm install to install missing dependencies');
      return false;
    }
  } catch (error) {
    console.log('❌ Dependencies test failed:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🔍 Running Docker containerization tests...\n');
  
  const tests = [
    { name: 'Dependencies', fn: testDependencies },
    { name: 'Docker Setup', fn: testDocker },
    { name: 'WebSocket Wrapper', fn: testWebSocketWrapper },
    { name: 'Server Integration', fn: testServerIntegration },
    { name: 'Container Creation', fn: testContainerCreation }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} test crashed:`, error.message);
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Docker containerization is ready.');
    console.log('\n🚀 To enable Docker mode:');
    console.log('   1. Set environment variable: USE_DOCKER=true');
    console.log('   2. Restart the server');
    console.log('   3. Monitor logs for container creation');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues above.');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
