const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runDonorRegression() {
  console.log('=== RUNNING DONOR CORE REGRESSION TEST SUITE ===');
  let passed = 0;
  let failed = 0;

  function assert(cond, name, details = '') {
    if (cond) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  const ts = Date.now();
  const donorEmail = `donor.reg.${ts}@test.com`;

  // 1. Donor registration
  const reg = await makeRequest('POST', '/api/auth/register', {
    name: 'Donor Regression User',
    email: donorEmail,
    password: 'Password@123',
    phone: '+91 98765 11111',
    bloodGroup: 'B+',
    city: 'Chennai',
    role: 'donor',
    age: 28
  });
  assert(reg.status === 201 && reg.body?.data?.token, 'Donor registration');
  const token = reg.body?.data?.token;

  // 2. Donor login
  const login = await makeRequest('POST', '/api/auth/login', {
    email: donorEmail,
    password: 'Password@123'
  });
  assert(login.status === 200 && login.body?.data?.user?.role === 'donor', 'Donor login');

  // 3. Donor profile GET
  const profile = await makeRequest('GET', '/api/donor/profile', null, token);
  assert(profile.status === 200 && profile.body?.data?.user?.email === donorEmail, 'Donor profile GET');

  // 4. Donor profile UPDATE
  const update = await makeRequest('PUT', '/api/donor/profile', { name: 'Updated Donor Name' }, token);
  assert(update.status === 200 && update.body?.data?.user?.name === 'Updated Donor Name', 'Donor profile UPDATE');

  // 5. Blood banks listing
  const centers = await makeRequest('GET', '/api/donor/blood-banks?search=Chennai', null, token);
  assert(centers.status === 200 && Array.isArray(centers.body?.data?.bloodBanks) && centers.body?.data?.bloodBanks.length > 0, 'Donation centers listing');

  // 6. Check eligibility
  const elig = await makeRequest('GET', '/api/donor/eligibility', null, token);
  assert(elig.status === 200 && elig.body?.data?.isEligible === true, 'Donor eligibility check');

  // 7. Book appointment
  const bankId = centers.body.data.bloodBanks[0].id;
  const book = await makeRequest('POST', '/api/donor/appointments', {
    bloodBankId: bankId,
    appointmentDate: '2026-09-20',
    appointmentTime: '10:00 AM'
  }, token);
  assert(book.status === 201 && book.body?.data?.appointment?.id, 'Donor appointment booking');
  const apptId = book.body?.data?.appointment?.id;

  // 8. List donor appointments
  const list = await makeRequest('GET', '/api/donor/appointments', null, token);
  assert(list.status === 200 && list.body?.data?.appointments?.some(a => a.id === apptId), 'Donor list appointments');

  // 9. Cancel appointment
  const cancel = await makeRequest('PATCH', `/api/donor/appointments/${apptId}/cancel`, {}, token);
  assert(cancel.status === 200 && cancel.body?.data?.appointment?.status === 'CANCELLED', 'Donor cancel appointment');

  // 10. Donor donation history
  const history = await makeRequest('GET', '/api/donor/donations', null, token);
  assert(history.status === 200 && Array.isArray(history.body?.data?.donations), 'Donor donation history retrieval');

  console.log(`\nDONOR REGRESSION SUMMARY: PASS=${passed} | FAIL=${failed}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runDonorRegression();
