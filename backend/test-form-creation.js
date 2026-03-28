const http = require('http');

async function test() {
  // First get a core user token
  const loginRes = await new Promise((resolve) => {
    const req = http.request('http://localhost:3001/api/core-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        resolve({
          status: r.statusCode,
          data: JSON.parse(d)
        });
      });
    });
    req.write(JSON.stringify({
      email: 'admin@degas.com',
      password: 'admin123'
    }));
    req.end();
  });

  console.log('Login status:', loginRes.status);
  const token = loginRes.data.data?.token;
  console.log('Got token:', token ? 'Yes' : 'No');

  if (!token) {
    console.log('Full response:', JSON.stringify(loginRes.data, null, 2));
    return;
  }

  // Now test form creation with core user token
  console.log('\nTesting form creation with core user token...');
  const req = http.request('http://localhost:3001/api/admin/forms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    }
  }, (r) => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => {
      console.log('Status:', r.statusCode);
      try {
        const resp = JSON.parse(d);
        console.log('Response:', JSON.stringify(resp, null, 2));
      } catch (e) {
        console.log('Response (raw):', d);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e.message);
  });

  req.write(JSON.stringify({
    form_name: 'Dynamic Test Form',
    target_table: 'DynamicTestTable',
    is_active: true,
    fields: [
      {
        field_name: 'name',
        field_label: 'Full Name',
        field_type: 'text',
        is_required: true,
        field_order: 1
      },
      {
        field_name: 'email',
        field_label: 'Email',
        field_type: 'email',
        is_required: true,
        is_email_field: true,
        field_order: 2
      },
      {
        field_name: 'password',
        field_label: 'Password',
        field_type: 'password',
        is_required: true,
        is_password_field: true,
        field_order: 3
      }
    ]
  }));
  req.end();
}

test();
