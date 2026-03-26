const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const ADMIN_EMAIL = 'admin@degas.com';
const ADMIN_PASSWORD = 'admin123';

let authToken = '';

async function login() {
  console.log('\n🔐 Logging in...');
  try {
    const response = await axios.post(`${BASE_URL}/core-auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    authToken = response.data.data.token;
    console.log('✅ Login successful, token length:', authToken.length);
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getAllForms() {
  console.log('\n📋 Getting all forms (admin endpoint)...');
  
  try {
    console.log('   Using token:', authToken.substring(0, 20) + '...');
    console.log('   URL:', `${BASE_URL}/admin/forms`);
    
    const response = await axios.get(`${BASE_URL}/admin/forms`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ All forms retrieved');
    console.log('   Status:', response.status);
    console.log('   Response keys:', Object.keys(response.data));
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Failed to get all forms');
    console.error('   Status:', error.response?.status);
    console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
    console.error('   Message:', error.message);
    return false;
  }
}

async function createForm() {
  console.log('\n📝 Creating new form...');
  
  const formData = {
    form_name: 'Test Form',
    target_table: 'Students',
    description: 'Test',
    is_active: true,
    fields: [
      {
        field_name: 'email',
        field_label: 'Email',
        field_type: 'email',
        is_required: true,
        is_email_field: true,
        is_password_field: false,
        field_order: 1
      },
      {
        field_name: 'password',
        field_label: 'Password',
        field_type: 'password',
        is_required: true,
        is_email_field: false,
        is_password_field: true,
        field_order: 2
      }
    ]
  };

  try {
    console.log('   Sending form data with', formData.fields.length, 'fields');
    const response = await axios.post(`${BASE_URL}/admin/forms`, formData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Form created');
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Form creation failed');
    console.error('   Status:', error.response?.status);
    console.error('   Response:', JSON.stringify(error.response?.data, null, 2));
    console.error('   Message:', error.message);
    return false;
  }
}

async function runTests() {
  if (!await login()) {
    console.error('\n💥 Cannot continue - login failed');
    return;
  }

  await getAllForms();
  await createForm();
}

runTests().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
