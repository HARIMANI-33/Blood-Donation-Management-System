const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch (e) {
            parsed = rawData;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('  STARTING HOSPITAL BACKEND VERIFICATION TEST SUITE ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const hospitalEmailA = `hospital.test.a.${timestamp}@citymed.org`;
  const hospitalEmailB = `hospital.test.b.${timestamp}@metromed.org`;
  const donorEmail = `donor.test.${timestamp}@example.com`;
  const bloodBankEmailA = `bb.test.a.${timestamp}@bloodbank.org`;
  const bloodBankEmailB = `bb.test.b.${timestamp}@bloodbank.org`;

  let hospitalTokenA, hospitalIdA, hospitalUserIdA;
  let hospitalTokenB, hospitalIdB;
  let donorToken;
  let bloodBankTokenA, bloodBankIdA;
  let bloodBankTokenB, bloodBankIdB;

  try {
    // 0. Setup helper users: Donor and two Blood Banks
    const donorReg = await makeRequest('POST', '/api/auth/register', {
      name: 'Test Donor',
      email: donorEmail,
      password: 'Password@123',
      phone: '+91 98765 43210',
      bloodGroup: 'O+',
      city: 'Chennai',
      role: 'donor',
      age: 25
    });
    donorToken = donorReg.body?.data?.token;

    // Blood Bank A (Chennai)
    const bbRegA = await makeRequest('POST', '/api/blood-banks/register', {
      organizationName: `Life Blood Bank A ${timestamp}`,
      email: bloodBankEmailA,
      password: 'Password@123',
      phone: '+91 44 2345 6789',
      city: 'Chennai',
      address: '100 Mount Road, Chennai',
      operatingHours: '08:00 AM - 08:00 PM'
    });
    bloodBankTokenA = bbRegA.body?.data?.token;
    bloodBankIdA = bbRegA.body?.data?.bloodBank?.id;

    // Blood Bank B (Coimbatore)
    const bbRegB = await makeRequest('POST', '/api/blood-banks/register', {
      organizationName: `Care Blood Centre B ${timestamp}`,
      email: bloodBankEmailB,
      password: 'Password@123',
      phone: '+91 422 234 5678',
      city: 'Coimbatore',
      address: '50 Avinashi Road, Coimbatore',
      operatingHours: '09:00 AM - 05:00 PM'
    });
    bloodBankTokenB = bbRegB.body?.data?.token;
    bloodBankIdB = bbRegB.body?.data?.bloodBank?.id;

    // Set initial inventory in Blood Bank A: O+ = 20 units
    await makeRequest('PUT', `/api/blood-banks/me/inventory/O%2B`, { quantity: 20 }, bloodBankTokenA);
    // Set initial inventory in Blood Bank B: O+ = 5 units
    await makeRequest('PUT', `/api/blood-banks/me/inventory/O%2B`, { quantity: 5 }, bloodBankTokenB);

    // TEST 1: Hospital registration
    const regA = await makeRequest('POST', '/api/hospital/register', {
      hospitalName: 'Apollo City Hospital',
      officialEmail: hospitalEmailA,
      password: 'HospitalPass@123',
      phone: '+91 44 2829 0000',
      city: 'Chennai',
      fullAddress: '21 Greams Lane, Thousand Lights, Chennai',
      openingHours: '24/7 Available',
      emergencyContact: '+91 44 2829 1111',
      hospitalType: 'SUPER_SPECIALTY'
    });

    assert(
      regA.status === 201 && regA.body?.data?.hospital?.id && regA.body?.token,
      'Test 1: Hospital registration',
      `Status: ${regA.status}, Body: ${JSON.stringify(regA.body)}`
    );

    hospitalTokenA = regA.body?.token;
    hospitalIdA = regA.body?.data?.hospital?.id;
    hospitalUserIdA = regA.body?.data?.user?.id;

    // Register Hospital B
    const regB = await makeRequest('POST', '/api/hospital/register', {
      hospitalName: 'Metro General Hospital',
      officialEmail: hospitalEmailB,
      password: 'HospitalPass@123',
      phone: '+91 44 2400 0000',
      city: 'Chennai',
      fullAddress: '50 Anna Salai, Chennai'
    });
    hospitalTokenB = regB.body?.token;
    hospitalIdB = regB.body?.data?.hospital?.id;

    // TEST 2: Duplicate hospital registration
    const dupReg = await makeRequest('POST', '/api/hospital/register', {
      hospitalName: 'Apollo City Hospital Duplicate',
      officialEmail: hospitalEmailA,
      password: 'HospitalPass@123',
      phone: '+91 44 2829 0000',
      city: 'Chennai',
      fullAddress: '21 Greams Lane, Thousand Lights, Chennai'
    });
    assert(
      dupReg.status === 409,
      'Test 2: Duplicate hospital registration rejected with 409 Conflict',
      `Status: ${dupReg.status}`
    );

    // TEST 3: Hospital login
    const loginRes = await makeRequest('POST', '/api/hospital/login', {
      email: hospitalEmailA,
      password: 'HospitalPass@123'
    });
    assert(
      loginRes.status === 200 &&
        loginRes.body?.token &&
        (loginRes.body?.user?.role === 'hospital' || loginRes.body?.data?.user?.role === 'hospital'),
      'Test 3: Hospital login returns token and role: hospital',
      `Status: ${loginRes.status}, role: ${loginRes.body?.user?.role}`
    );

    // TEST 4: Wrong password
    const wrongPass = await makeRequest('POST', '/api/hospital/login', {
      email: hospitalEmailA,
      password: 'WrongPassword@999'
    });
    assert(
      wrongPass.status === 401,
      'Test 4: Wrong password rejected with 401',
      `Status: ${wrongPass.status}`
    );

    // TEST 5: Hospital profile retrieval
    const profileRes = await makeRequest('GET', '/api/hospital/profile', null, hospitalTokenA);
    assert(
      profileRes.status === 200 &&
        profileRes.body?.data?.name === 'Apollo City Hospital' &&
        profileRes.body?.data?.city === 'Chennai',
      'Test 5: Hospital profile retrieval',
      `Status: ${profileRes.status}, data: ${JSON.stringify(profileRes.body?.data)}`
    );

    // TEST 6: Hospital profile update
    const updateProfileRes = await makeRequest(
      'PATCH',
      '/api/hospital/profile',
      {
        phone: '+91 44 9999 8888',
        emergencyContact: '+91 44 9999 0000'
      },
      hospitalTokenA
    );
    assert(
      updateProfileRes.status === 200 && updateProfileRes.body?.data?.phone === '+91 44 9999 8888',
      'Test 6: Hospital profile update',
      `Status: ${updateProfileRes.status}, phone: ${updateProfileRes.body?.data?.phone}`
    );

    // TEST 7: Unauthorized profile access (no token)
    const unauthProfile = await makeRequest('GET', '/api/hospital/profile');
    assert(
      unauthProfile.status === 401,
      'Test 7: Unauthorized profile access rejected with 401',
      `Status: ${unauthProfile.status}`
    );

    // TEST 8: Donor trying to access hospital endpoint -> 403
    const donorForbidden = await makeRequest('GET', '/api/hospital/profile', null, donorToken);
    assert(
      donorForbidden.status === 403,
      'Test 8: Donor accessing hospital endpoint rejected with 403',
      `Status: ${donorForbidden.status}`
    );

    // TEST 9: Blood Bank trying to access hospital endpoint -> 403
    const bbForbidden = await makeRequest('GET', '/api/hospital/profile', null, bloodBankTokenA);
    assert(
      bbForbidden.status === 403,
      'Test 9: Blood Bank accessing hospital endpoint rejected with 403',
      `Status: ${bbForbidden.status}`
    );

    // TEST 10: Hospital searches blood by blood group
    const searchBgRes = await makeRequest('GET', '/api/hospital/blood/search?bloodGroup=O%2B&quantity=5');
    assert(
      searchBgRes.status === 200 && Array.isArray(searchBgRes.body?.data) && searchBgRes.body?.data.length > 0,
      'Test 10: Hospital searches blood by blood group',
      `Status: ${searchBgRes.status}, Count: ${searchBgRes.body?.count}`
    );

    // TEST 11: Hospital searches blood by quantity
    const searchQtyRes = await makeRequest('GET', '/api/hospital/blood/search?bloodGroup=O%2B&quantity=15');
    assert(
      searchQtyRes.status === 200 &&
        searchQtyRes.body?.data.every((b) => b.availableQuantity >= 15),
      'Test 11: Hospital searches blood by quantity (all results >= requested quantity)',
      `Count: ${searchQtyRes.body?.data?.length}`
    );

    // TEST 12: Hospital searches blood by city
    const searchCityRes = await makeRequest(
      'GET',
      '/api/hospital/blood/search?bloodGroup=O%2B&city=Chennai&quantity=5'
    );
    assert(
      searchCityRes.status === 200 &&
        searchCityRes.body?.data.every((b) => b.city.toLowerCase().includes('chennai')),
      'Test 12: Hospital searches blood by city',
      `Count: ${searchCityRes.body?.data?.length}`
    );

    // TEST 13: Hospital searches blood by urgency
    const searchUrgencyRes = await makeRequest(
      'GET',
      '/api/hospital/blood/search?bloodGroup=O%2B&city=Chennai&quantity=5&urgency=CRITICAL'
    );
    assert(
      searchUrgencyRes.status === 200 && searchUrgencyRes.body?.urgency === 'CRITICAL',
      'Test 13: Hospital searches blood by urgency',
      `Status: ${searchUrgencyRes.status}`
    );

    // TEST 14: Search returns only sufficient inventory (Blood Bank A has 20, Blood Bank B has 5)
    // When requesting 10 units of O+ in Chennai/Coimbatore:
    // Blood Bank A (20 >= 10) must be included; Blood Bank B (5 < 10) must NOT be included.
    const searchSufficientRes = await makeRequest(
      'GET',
      '/api/hospital/blood/search?bloodGroup=O%2B&quantity=10'
    );
    const bankBInResults = searchSufficientRes.body?.data?.some(
      (b) => b.bloodBankId === bloodBankIdB
    );
    const bankAInResults = searchSufficientRes.body?.data?.some(
      (b) => b.bloodBankId === bloodBankIdA
    );
    assert(
      searchSufficientRes.status === 200 && bankAInResults === true && bankBInResults === false,
      'Test 14: Search returns ONLY blood banks with sufficient inventory (Blood Bank B with 5 excluded for 10-unit request)',
      `bankAIncluded: ${bankAInResults}, bankBIncluded: ${bankBInResults}`
    );

    // TEST 15: Hospital creates request for selected Blood Bank
    const createReqRes = await makeRequest(
      'POST',
      '/api/hospital/requests',
      {
        bloodBankId: bloodBankIdA,
        bloodGroup: 'O+',
        quantity: 5,
        urgency: 'URGENT',
        message: 'Urgent surgery requirement',
        patientName: 'John Doe',
        requiredDate: '2026-09-10'
      },
      hospitalTokenA
    );
    const requestId = createReqRes.body?.data?.request?.id;
    assert(
      createReqRes.status === 201 &&
        requestId &&
        createReqRes.body?.data?.request?.status === 'PENDING' &&
        createReqRes.body?.data?.request?.bloodBankId === bloodBankIdA,
      'Test 15: Hospital creates request for selected Blood Bank (status PENDING)',
      `Status: ${createReqRes.status}, RequestId: ${requestId}`
    );

    // TEST 16: Request appears only for selected Blood Bank (Blood Bank A sees it, Blood Bank B does NOT)
    const bbARequests = await makeRequest('GET', '/api/blood-banks/me/requests', null, bloodBankTokenA);
    const bbBRequests = await makeRequest('GET', '/api/blood-banks/me/requests', null, bloodBankTokenB);

    const bbAHasReq = bbARequests.body?.data?.requests?.some((r) => r.id === requestId);
    const bbBHasReq = bbBRequests.body?.data?.requests?.some((r) => r.id === requestId);

    assert(
      bbAHasReq === true && bbBHasReq === false,
      'Test 16: Request appears ONLY for selected Blood Bank (not broadcast to other blood banks)',
      `Blood Bank A has request: ${bbAHasReq}, Blood Bank B has request: ${bbBHasReq}`
    );

    // TEST 17: Hospital sees its own request
    const hospARequests = await makeRequest('GET', '/api/hospital/requests', null, hospitalTokenA);
    const hospAHasReq = hospARequests.body?.data?.requests?.some((r) => r.id === requestId);
    assert(
      hospARequests.status === 200 && hospAHasReq === true,
      'Test 17: Hospital sees its own request',
      `Found in hospital A list: ${hospAHasReq}`
    );

    // TEST 18: Another hospital cannot see the request
    const hospBRequests = await makeRequest('GET', '/api/hospital/requests', null, hospitalTokenB);
    const hospBHasReq = hospBRequests.body?.data?.requests?.some((r) => r.id === requestId);
    const hospBDetail = await makeRequest('GET', `/api/hospital/requests/${requestId}`, null, hospitalTokenB);

    assert(
      hospBHasReq === false && (hospBDetail.status === 403 || hospBDetail.status === 404),
      'Test 18: Another hospital cannot see or access Hospital A request (403 Forbidden)',
      `Hospital B list contains req: ${hospBHasReq}, Detail status: ${hospBDetail.status}`
    );

    // TEST 19: Wrong Blood Bank cannot manage the request
    const wrongBBAction = await makeRequest(
      'PATCH',
      `/api/blood-banks/me/requests/${requestId}/accept`,
      {},
      bloodBankTokenB
    );
    assert(
      wrongBBAction.status === 403,
      'Test 19: Wrong Blood Bank cannot accept/manage request (403 Forbidden)',
      `Status: ${wrongBBAction.status}`
    );

    // TEST 20: Blood Bank accepts request
    const acceptRes = await makeRequest(
      'PATCH',
      `/api/blood-banks/me/requests/${requestId}/accept`,
      {},
      bloodBankTokenA
    );
    assert(
      acceptRes.status === 200 && acceptRes.body?.data?.request?.status === 'ACCEPTED',
      'Test 20: Blood Bank accepts request (status updated to ACCEPTED)',
      `Status: ${acceptRes.status}, reqStatus: ${acceptRes.body?.data?.request?.status}`
    );

    // TEST 23: Request creation does NOT decrease inventory (Requirement 14 verification)
    // Check inventory of Blood Bank A before fulfillment: O+ should STILL be 20!
    const invCheckBefore = await makeRequest('GET', '/api/blood-banks/me/inventory', null, bloodBankTokenA);
    const oPlusBefore = invCheckBefore.body?.data?.inventory?.find((i) => i.bloodGroup === 'O+')
      ?.quantity;
    assert(
      oPlusBefore === 20,
      'Test 23: Request creation and acceptance did NOT decrease Blood Bank inventory (still 20 units)',
      `Current O+ units: ${oPlusBefore}`
    );

    // TEST 22: Fulfillment decreases inventory correctly
    const fulfillRes = await makeRequest(
      'PATCH',
      `/api/blood-banks/me/requests/${requestId}/fulfill`,
      {},
      bloodBankTokenA
    );
    const invCheckAfter = await makeRequest('GET', '/api/blood-banks/me/inventory', null, bloodBankTokenA);
    const oPlusAfter = invCheckAfter.body?.data?.inventory?.find((i) => i.bloodGroup === 'O+')
      ?.quantity;

    assert(
      fulfillRes.status === 200 &&
        fulfillRes.body?.data?.request?.status === 'FULFILLED' &&
        oPlusAfter === 15,
      'Test 22: Fulfillment decreases inventory correctly (from 20 -> 15 units for 5 units fulfilled)',
      `fulfillStatus: ${fulfillRes.status}, Remaining O+: ${oPlusAfter}`
    );

    // TEST 24: Duplicate fulfillment is rejected (409 Conflict)
    const dupFulfill = await makeRequest(
      'PATCH',
      `/api/blood-banks/me/requests/${requestId}/fulfill`,
      {},
      bloodBankTokenA
    );
    assert(
      dupFulfill.status === 409,
      'Test 24: Duplicate fulfillment rejected with 409 Conflict',
      `Status: ${dupFulfill.status}, message: ${dupFulfill.body?.message}`
    );

    // TEST 21: Blood Bank rejects request (create request 2 and reject it)
    const req2 = await makeRequest(
      'POST',
      '/api/hospital/requests',
      {
        bloodBankId: bloodBankIdA,
        bloodGroup: 'A+',
        quantity: 2,
        urgency: 'NORMAL',
        message: 'Second test request'
      },
      hospitalTokenA
    );
    const req2Id = req2.body?.data?.request?.id;
    const rejectRes = await makeRequest(
      'PATCH',
      `/api/blood-banks/me/requests/${req2Id}/reject`,
      {},
      bloodBankTokenA
    );
    assert(
      rejectRes.status === 200 && rejectRes.body?.data?.request?.status === 'REJECTED',
      'Test 21: Blood Bank rejects request (status updated to REJECTED)',
      `Status: ${rejectRes.status}, reqStatus: ${rejectRes.body?.data?.request?.status}`
    );

    // TEST 25: Negative quantity is rejected
    const negQtyReq = await makeRequest(
      'POST',
      '/api/hospital/requests',
      {
        bloodBankId: bloodBankIdA,
        bloodGroup: 'O+',
        quantity: -5
      },
      hospitalTokenA
    );
    const negQtySearch = await makeRequest('GET', '/api/hospital/blood/search?bloodGroup=O%2B&quantity=-5');
    assert(
      negQtyReq.status === 400 && negQtySearch.status === 400,
      'Test 25: Negative quantity is rejected in both request creation and search (400)',
      `ReqStatus: ${negQtyReq.status}, SearchStatus: ${negQtySearch.status}`
    );

    // TEST 26: Invalid blood group is rejected
    const invalidBgReq = await makeRequest(
      'POST',
      '/api/hospital/requests',
      {
        bloodBankId: bloodBankIdA,
        bloodGroup: 'INVALID_GROUP',
        quantity: 2
      },
      hospitalTokenA
    );
    const invalidBgSearch = await makeRequest('GET', '/api/hospital/blood/search?bloodGroup=XYZ&quantity=2');
    assert(
      invalidBgReq.status === 400 && invalidBgSearch.status === 400,
      'Test 26: Invalid blood group is rejected in both request creation and search (400)',
      `ReqStatus: ${invalidBgReq.status}, SearchStatus: ${invalidBgSearch.status}`
    );
  } catch (err) {
    console.error('Unexpected error during test execution:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`  HOSPITAL TEST RESULTS: PASS=${passed} | FAIL=${failed}`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
