const http = require('http');

async function test() {
  // Get core token
  const loginRes = await new Promise((resolve) => {
    const req = http.request('http://localhost:3001/api/core-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve(JSON.parse(d)));
    });
    req.write(JSON.stringify({
      email: 'admin@degas.com',
      password: 'admin123'
    }));
    req.end();
  });

  const token = loginRes.data?.token;
  console.log('Token obtained:', !!token);
  console.log('Token preview:', token?.substring(0, 20) + '...');

  // Try form creation with all required fields
  const formRes = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/admin/forms',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        console.log('Form creation status:', r.statusCode);
        console.log('Raw response:', d);
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          resolve({ error: 'parse error', raw: d });
        }
      });
    });
    req.on('error', e => {
      console.error('Request error:', e.message);
      resolve({ error: e.message });
    });
    
    const body = {
      form_name: 'Debug Form',
      target_table: 'DebugTable' + Date.now(),
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
    
    console.log('\nSending form data:', JSON.stringify(body, null, 2));
    req.write(JSON.stringify(body));
    req.end();
  });

  console.log('\nForm response:', JSON.stringify(formRes, null, 2));
}

test();
