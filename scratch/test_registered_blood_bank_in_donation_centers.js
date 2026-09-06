const http = require('http');

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (data) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, data: parsed });
          } catch {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  console.log('=== TEST: New Blood Bank Registration & Visibility in Donor Donation Centers ===\n');

  const timestamp = Date.now();
  const testBankName = `Global Care Blood Bank ${timestamp}`;
  const testCity = 'Trichy';
  const testAddress = '55 Bharathidasan Salai, Cantonment';
  const testEmail = `globalcare_${timestamp}@bloodbank.org`;

  console.log(`1. Registering new Blood Bank: "${testBankName}" in "${testCity}"...`);
  const bbReg = await request('POST', '/api/blood-banks/register', {
    organizationName: testBankName,
    email: testEmail,
    password: 'Password123!',
    phone: '9840123456',
    city: testCity,
    fullAddress: testAddress,
    openingHours: '08:00 AM - 08:00 PM'
  });

  if (bbReg.status !== 201) {
    throw new Error(`Blood Bank registration failed with status ${bbReg.status}: ${JSON.stringify(bbReg.data)}`);
  }
  const bbId = bbReg.data.data.bloodBank.id;
  const bbToken = bbReg.data.data.token;
  console.log(`✓ Blood Bank registered successfully with ID: ${bbId}`);

  console.log('\n2. Registering / logging in as a Donor...');
  const donorEmail = `donor_${timestamp}@gmail.com`;
  const donorReg = await request('POST', '/api/auth/register', {
    name: 'Kavitha Ram',
    email: donorEmail,
    password: 'Password123!',
    phone: '9790123456',
    bloodGroup: 'B+',
    city: 'Chennai' // Note: donor is registered in Chennai
  });
  if (donorReg.status !== 201) {
    throw new Error(`Donor registration failed with status ${donorReg.status}`);
  }
  const donorToken = donorReg.data.data.token;
  console.log(`✓ Donor registered successfully (City: Chennai)`);

  console.log('\n3. Donor fetches ALL donation centers without city filter (default view in modal)...');
  const allCentersRes = await request('GET', '/api/donor/blood-banks', null, donorToken);
  if (allCentersRes.status !== 200) {
    throw new Error(`Failed to fetch centers: status ${allCentersRes.status}`);
  }
  const centers = allCentersRes.data.data.bloodBanks;
  console.log(`Total donation centers found: ${centers.length}`);

  const foundCenter = centers.find((c) => c.id === bbId);
  if (!foundCenter) {
    throw new Error(`Newly registered Blood Bank "${testBankName}" was NOT found in donor centers list!`);
  }
  console.log(`✓ Newly registered Blood Bank found in centers list:`, {
    id: foundCenter.id,
    name: foundCenter.name,
    city: foundCenter.city,
    address: foundCenter.address
  });

  // Verify it appears at the very top or near top (created_at DESC)
  const isAtTop = centers[0].id === bbId;
  console.log(`✓ Is newly registered blood bank at the top (created_at DESC)? ${isAtTop ? 'YES' : 'NO (index: ' + centers.findIndex(c => c.id === bbId) + ')'}`);

  console.log(`\n4. Donor searches by Blood Bank Name: "?search=${encodeURIComponent('Global Care')}"...`);
  const searchNameRes = await request('GET', `/api/donor/blood-banks?search=${encodeURIComponent('Global Care')}`, null, donorToken);
  const searchNameMatches = searchNameRes.data.data.bloodBanks;
  const foundByName = searchNameMatches.find((c) => c.id === bbId);
  if (!foundByName) {
    throw new Error('Search by blood bank name failed to find newly registered blood bank!');
  }
  console.log(`✓ Found ${searchNameMatches.length} result(s) when searching by name "Global Care"`);

  console.log(`\n5. Donor searches by City: "?city=${encodeURIComponent(testCity)}" / "?search=${encodeURIComponent(testCity)}"...`);
  const searchCityRes = await request('GET', `/api/donor/blood-banks?city=${encodeURIComponent(testCity)}`, null, donorToken);
  const searchCityMatches = searchCityRes.data.data.bloodBanks;
  const foundByCity = searchCityMatches.find((c) => c.id === bbId);
  if (!foundByCity) {
    throw new Error('Search by city failed to find newly registered blood bank!');
  }
  console.log(`✓ Found ${searchCityMatches.length} result(s) when searching by city "${testCity}"`);

  console.log('\n6. Donor books an appointment directly at this newly registered blood bank...');
  const today = new Date().toISOString().split('T')[0];
  const bookRes = await request(
    'POST',
    '/api/donor/appointments',
    {
      bloodBankId: bbId,
      organizationId: bbId,
      appointmentDate: today,
      appointmentTime: '11:00 AM',
      notes: 'Booking appointment at newly registered blood bank'
    },
    donorToken
  );
  if (bookRes.status !== 201) {
    throw new Error(`Appointment booking failed with status ${bookRes.status}: ${JSON.stringify(bookRes.data)}`);
  }
  console.log('✓ Appointment booked successfully:', bookRes.data.message);

  console.log('\n7. Blood Bank views its incoming appointments...');
  const bbAppsRes = await request('GET', '/api/blood-banks/me/appointments', null, bbToken);
  const bbApps = bbAppsRes.data.data.appointments;
  console.log(`Blood bank sees ${bbApps.length} appointment(s):`, bbApps);
  const matchingApp = bbApps.find((a) => a.donor_name === 'Kavitha Ram' || a.donorName === 'Kavitha Ram');
  if (!matchingApp) {
    throw new Error('Blood bank could not see appointment from donor!');
  }
  console.log(`✓ Confirmed appointment received by Blood Bank:`, {
    donor: matchingApp.donorName,
    date: matchingApp.appointmentDate,
    time: matchingApp.appointmentTime,
    status: matchingApp.status
  });

  console.log('\n🎉 ALL TESTS PASSED! Newly registered blood banks are immediately visible in the donation centers module and can receive appointments!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
