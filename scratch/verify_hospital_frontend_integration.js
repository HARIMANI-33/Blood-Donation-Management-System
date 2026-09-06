const http = require('http');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:5000';

function fetchUrl(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: options.headers || {}
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function verifyFrontend() {
  console.log('================================================================');
  console.log('   HOSPITAL FRONTEND & BACKEND INTEGRATION VERIFICATION SUITE   ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // Part 1: Verify Frontend Dev Server & Route Serving (SPA Routing)
  console.log('>>> 1. Verifying Frontend Dev Server & SPA Route Serving...');
  const routes = [
    '/',
    '/hospital/login',
    '/hospital/register',
    '/hospital/dashboard',
    '/hospital/profile',
    '/hospital/find-blood',
    '/hospital/requests'
  ];

  for (const r of routes) {
    try {
      const res = await fetchUrl(`${FRONTEND_URL}${r}`);
      assert(
        res.status === 200 && typeof res.data === 'string' && res.data.includes('<div id="root">'),
        `SPA Route served: ${r}`,
        `Status: ${res.status}`
      );
    } catch (err) {
      assert(false, `SPA Route served: ${r}`, err.message);
    }
  }

  // Part 2: Verify Hospital Frontend Service Integration with Real Backend
  console.log('\n>>> 2. Verifying Hospital Frontend Service Contract with Backend...');
  const ts = Date.now();
  const hospitalEmail = `apollo.med.${ts}@cityhealth.org`;

  let hospitalToken;
  let hospitalId;
  let selectedBloodBankId;
  let createdRequestId;

  // A. Registration
  const regRes = await fetchUrl(`${BACKEND_URL}/api/hospital/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      hospitalName: 'Apollo Special Care Hospital',
      officialEmail: hospitalEmail,
      password: 'Hospital@12345',
      phone: '+91 44 2829 4444',
      city: 'Chennai',
      fullAddress: '85 Mount Road, Guindy, Chennai 600032',
      openingHours: '24/7 Available',
      emergencyContact: '+91 44 2829 5555',
      hospitalType: 'Super Specialty Hospital'
    }
  });

  assert(
    regRes.status === 201 && regRes.data?.data?.hospital?.name === 'Apollo Special Care Hospital',
    'Hospital Registration API contract',
    `Status: ${regRes.status}, Body: ${JSON.stringify(regRes.data)}`
  );

  hospitalToken = regRes.data?.token;
  hospitalId = regRes.data?.data?.hospital?.id;

  // B. Login
  const loginRes = await fetchUrl(`${BACKEND_URL}/api/hospital/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      email: hospitalEmail,
      password: 'Hospital@12345'
    }
  });

  assert(
    loginRes.status === 200 && loginRes.data?.token && loginRes.data?.user?.role === 'hospital',
    'Hospital Login API contract returns JWT & role hospital',
    `Status: ${loginRes.status}`
  );

  // C. Profile GET
  const profileRes = await fetchUrl(`${BACKEND_URL}/api/hospital/profile`, {
    headers: { Authorization: `Bearer ${hospitalToken}` }
  });

  assert(
    profileRes.status === 200 && profileRes.data?.data?.email === hospitalEmail,
    'Hospital Profile GET API contract',
    `Status: ${profileRes.status}`
  );

  // D. Profile UPDATE
  const updateProfRes = await fetchUrl(`${BACKEND_URL}/api/hospital/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hospitalToken}`
    },
    body: {
      phone: '+91 44 9999 7777',
      emergencyContact: '+91 44 9999 8888'
    }
  });

  assert(
    updateProfRes.status === 200 && updateProfRes.data?.data?.phone === '+91 44 9999 7777',
    'Hospital Profile UPDATE API contract',
    `Status: ${updateProfRes.status}`
  );

  // E. Blood Search
  const searchRes = await fetchUrl(
    `${BACKEND_URL}/api/hospital/blood/search?bloodGroup=O%2B&quantity=5&city=Chennai&urgency=HIGH`,
    {
      headers: { Authorization: `Bearer ${hospitalToken}` }
    }
  );

  assert(
    searchRes.status === 200 &&
      Array.isArray(searchRes.data?.data) &&
      searchRes.data.data.length > 0 &&
      searchRes.data.data.every((b) => b.canFulfill === true && b.availableQuantity >= 5),
    'Hospital Blood Search API contract (canFulfill = true)',
    `Status: ${searchRes.status}, Count: ${searchRes.data?.count}`
  );

  selectedBloodBankId = searchRes.data.data[0].bloodBankId;

  // F. Create Blood Request (does NOT decrease inventory)
  const createReqRes = await fetchUrl(`${BACKEND_URL}/api/hospital/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hospitalToken}`
    },
    body: {
      bloodBankId: selectedBloodBankId,
      bloodGroup: 'O+',
      quantity: 3,
      urgency: 'URGENT',
      notes: 'Urgent bypass surgery requirement',
      patientName: 'Kavitha R',
      requiredDate: '2026-09-12'
    }
  });

  assert(
    createReqRes.status === 201 &&
      createReqRes.data?.data?.request?.status === 'PENDING' &&
      createReqRes.data?.data?.request?.bloodBankId === selectedBloodBankId,
    'Hospital Blood Request Creation API contract (status PENDING, 1-to-1 bloodBankId)',
    `Status: ${createReqRes.status}`
  );

  createdRequestId = createReqRes.data?.data?.request?.id;

  // G. My Requests Listing
  const myReqsRes = await fetchUrl(`${BACKEND_URL}/api/hospital/requests`, {
    headers: { Authorization: `Bearer ${hospitalToken}` }
  });

  assert(
    myReqsRes.status === 200 &&
      Array.isArray(myReqsRes.data?.data?.requests) &&
      myReqsRes.data.data.requests.some((r) => r.id === createdRequestId),
    'Hospital My Requests Listing API contract',
    `Status: ${myReqsRes.status}, Total: ${myReqsRes.data?.data?.requests?.length}`
  );

  // H. Request Details
  const reqDetailRes = await fetchUrl(`${BACKEND_URL}/api/hospital/requests/${createdRequestId}`, {
    headers: { Authorization: `Bearer ${hospitalToken}` }
  });

  assert(
    reqDetailRes.status === 200 && reqDetailRes.data?.data?.request?.id === createdRequestId,
    'Hospital Request Details GET API contract',
    `Status: ${reqDetailRes.status}`
  );

  // I. Request Cancellation
  const cancelReqRes = await fetchUrl(
    `${BACKEND_URL}/api/hospital/requests/${createdRequestId}/cancel`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hospitalToken}` }
    }
  );

  assert(
    cancelReqRes.status === 200 && cancelReqRes.data?.data?.request?.status === 'CANCELLED',
    'Hospital Request Cancellation API contract',
    `Status: ${cancelReqRes.status}`
  );

  console.log('\n================================================================');
  console.log(`   INTEGRATION VERIFICATION SUMMARY: PASS=${passed} | FAIL=${failed}`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

verifyFrontend();
