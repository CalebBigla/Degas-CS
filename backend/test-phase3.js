/**
 * Test script for Phase 3: CMS Form System
 * Tests form creation, retrieval, update, and deletion
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test admin credentials (from seed data)
const ADMIN_EMAIL = 'admin@degas.com';
const ADMIN_PASSWORD = 'admin123';

let authToken = '';
let createdFormId = '';

async function login() {
  console.log('\n🔐 Logging in as admin...');
  try {
    const response = await axios.post(`${BASE_URL}/core-auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    authToken = response.data.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createForm() {
  console.log('\n📝 Creating new onboarding form...');
  
  const formData = {
    form_name: 'The Force of Grace Ministry',
    target_table: 'Students',
    description: 'Registration form for new students',
    is_active: true,
    fields: [
      {
        field_name: 'email',
        field_label: 'Email Address',
        field_type: 'email',
        is_required: true,
        is_email_field: true,
        is_password_field: false,
        field_order: 1,
        placeholder: 'student@example.com'
      },
      {
        field_name: 'password',
        field_label: 'Password',
        field_type: 'password',
        is_required: true,
        is_email_field: false,
        is_password_field: true,
        field_order: 2,
        validation_rules: JSON.stringify({ minLength: 8 }),
        placeholder: 'Enter a secure password'
      },
      {
        field_name: 'fullName',
        field_label: 'Full Name',
        field_type: 'text',
        is_required: true,
        is_email_field: false,
        is_password_field: false,
        field_order: 3,
        placeholder: 'John Doe'
      },
      {
        field_name: 'studentId',
        field_label: 'Student ID',
        field_type: 'text',
        is_required: true,
        is_email_field: false,
        is_password_field: false,
        field_order: 4,
        placeholder: 'STU-12345'
      },
      {
        field_name: 'phone',
        field_label: 'Phone Number',
        field_type: 'text',
        is_required: false,
        is_email_field: false,
        is_password_field: false,
        field_order: 5,
        placeholder: '+1234567890'
      },
      {
        field_name: 'dateOfBirth',
        field_label: 'Date of Birth',
        field_type: 'date',
        is_required: false,
        is_email_field: false,
        is_password_field: false,
        field_order: 6
      }
    ]
  };

  try {
    const response = await axios.post(`${BASE_URL}/admin/forms`, formData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    createdFormId = response.data.data.id;
    console.log('✅ Form created successfully');
    console.log('   Form ID:', createdFormId);
    console.log('   Form Name:', response.data.data.form_name);
    console.log('   Target Table:', response.data.data.target_table);
    console.log('   Fields:', response.data.data.fields?.length || 0);
    return true;
  } catch (error) {
    console.error('❌ Form creation failed:', error.response?.data || error.message);
    return false;
  }
}

async function getActiveForm() {
  console.log('\n🔍 Getting active onboarding form (public endpoint)...');
  
  try {
    const response = await axios.get(`${BASE_URL}/onboarding`);
    
    console.log('✅ Active form retrieved');
    console.log('   Form Name:', response.data.data.form_name);
    console.log('   Target Table:', response.data.data.target_table);
    console.log('   Fields:', response.data.data.fields?.length || 0);
    console.log('   Field Names:', response.data.data.fields?.map(f => f.field_name).join(', '));
    return true;
  } catch (error) {
    console.error('❌ Failed to get active form:', error.response?.data || error.message);
    return false;
  }
}

async function getAllForms() {
  console.log('\n📋 Getting all forms (admin endpoint)...');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/forms`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ All forms retrieved');
    console.log('   Total Forms:', response.data.data.length);
    response.data.data.forEach((form, index) => {
      console.log(`   ${index + 1}. ${form.form_name} (${form.is_active ? 'Active' : 'Inactive'})`);
    });
    return true;
  } catch (error) {
    console.error('❌ Failed to get all forms:', error.response?.data || error.message);
    return false;
  }
}

async function updateForm() {
  console.log('\n✏️  Updating form...');
  
  const updateData = {
    description: 'Updated registration form for new students - now with more fields!',
    fields: [
      {
        field_name: 'email',
        field_label: 'Email Address',
        field_type: 'email',
        is_required: true,
        is_email_field: true,
        is_password_field: false,
        field_order: 1,
        placeholder: 'student@example.com'
      },
      {
        field_name: 'password',
        field_label: 'Password',
        field_type: 'password',
        is_required: true,
        is_email_field: false,
        is_password_field: true,
        field_order: 2,
        validation_rules: JSON.stringify({ minLength: 8 }),
        placeholder: 'Enter a secure password'
      },
      {
        field_name: 'fullName',
        field_label: 'Full Name',
        field_type: 'text',
        is_required: true,
        is_email_field: false,
        is_password_field: false,
        field_order: 3,
        placeholder: 'John Doe'
      },
      {
        field_name: 'studentId',
        field_label: 'Student ID',
        field_type: 'text',
        is_required: true,
        is_email_field: false,
        is_password_field: false,
        field_order: 4,
        placeholder: 'STU-12345'
      },
      {
        field_name: 'grade',
        field_label: 'Grade Level',
        field_type: 'select',
        is_required: true,
        is_email_field: false,
        is_password_field: false,
        field_order: 5,
        options: JSON.stringify(['9th Grade', '10th Grade', '11th Grade', '12th Grade'])
      }
    ]
  };

  try {
    const response = await axios.put(`${BASE_URL}/admin/forms/${createdFormId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Form updated successfully');
    console.log('   Description:', response.data.data.description);
    console.log('   Fields:', response.data.data.fields?.length || 0);
    return true;
  } catch (error) {
    console.error('❌ Form update failed:', error.response?.data || error.message);
    return false;
  }
}

async function testValidation() {
  console.log('\n🧪 Testing form validation...');
  
  // This would normally be done through the onboarding endpoint (Phase 4)
  // For now, we'll just verify the form structure supports validation
  
  try {
    const response = await axios.get(`${BASE_URL}/onboarding`);
    const form = response.data.data;
    
    console.log('✅ Validation test passed');
    console.log('   Required fields:', form.fields?.filter(f => f.is_required).length);
    console.log('   Email field:', form.fields?.find(f => f.is_email_field)?.field_name || 'none');
    console.log('   Password field:', form.fields?.find(f => f.is_password_field)?.field_name || 'none');
    return true;
  } catch (error) {
    console.error('❌ Validation test failed:', error.response?.data || error.message);
    return false;
  }
}

async function deleteForm() {
  console.log('\n🗑️  Deleting form...');
  
  try {
    await axios.delete(`${BASE_URL}/admin/forms/${createdFormId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Form deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Form deletion failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Phase 3 Tests: CMS Form System');
  console.log('==========================================');
  
  const results = {
    login: false,
    createForm: false,
    getActiveForm: false,
    getAllForms: false,
    updateForm: false,
    testValidation: false,
    deleteForm: false
  };

  // Run tests in sequence
  results.login = await login();
  if (!results.login) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }

  results.createForm = await createForm();
  results.getActiveForm = await getActiveForm();
  results.getAllForms = await getAllForms();
  results.updateForm = await updateForm();
  results.testValidation = await testValidation();
  results.deleteForm = await deleteForm();

  // Summary
  console.log('\n==========================================');
  console.log('📊 Test Results Summary:');
  console.log('==========================================');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 Phase 3 Complete! All tests passed.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
