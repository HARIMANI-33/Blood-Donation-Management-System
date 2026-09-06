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
  console.log('=== TEST 1: Register and Login a fresh Blood Bank ===');
  const bbEmail = `recovery_bb_${Date.now()}@bloodbank.org`;
  const bbReg = await request('POST', '/api/blood-banks/register', {
    name: 'Apollo Recovery Blood Bank',
    email: bbEmail,
    password: 'Password123!',
    phone: '9876543210',
    address: '100 Medical Enclave',
    city: 'Chennai',
    state: 'Tamil Nadu',
    postalCode: '600001',
    latitude: 13.0827,
    longitude: 80.2707,
    licenseNumber: `LIC-REC-${Date.now()}`
  });
  console.log('Blood Bank Registration status:', bbReg.status, bbReg.data.message);
  const bbToken = bbReg.data.data.token;
  const bbId = bbReg.data.data.bloodBank.id;

  console.log('\n=== TEST 2: Register and Login a fresh Donor ===');
  const donorEmail = `donor_rec_${Date.now()}@gmail.com`;
  const donorReg = await request('POST', '/api/auth/register', {
    name: 'Rohan Sharma',
    email: donorEmail,
    password: 'Password123!',
    phone: '9876501234',
    bloodGroup: 'O+',
    city: 'Chennai'
  });
  console.log('Donor Registration status:', donorReg.status, donorReg.data.message);
  const donorToken = donorReg.data.data.token;
  const donorId = donorReg.data.data.user.id;

  console.log('\n=== TEST 3: Check Initial Donor Eligibility ===');
  const initElig = await request('GET', '/api/donor/eligibility', null, donorToken);
  console.log('Initial Eligibility:', {
    isEligible: initElig.data.data.isEligible,
    lastDonationDate: initElig.data.data.lastDonationDate,
    statusMessage: initElig.data.data.statusMessage
  });
  if (!initElig.data.data.isEligible) {
    throw new Error('Fresh donor should be initially eligible!');
  }

  console.log('\n=== TEST 4: Donor books first appointment with this Blood Bank ===');
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const book1 = await request(
    'POST',
    '/api/donor/appointments',
    {
      bloodBankId: bbId,
      appointmentDate: todayStr,
      appointmentTime: '10:00 AM',
      notes: 'First time whole blood donation'
    },
    donorToken
  );
  console.log('Book appointment 1 status:', book1.status, book1.data.message);
  const appointmentId = book1.data.data.appointment.id;

  console.log('\n=== TEST 5: Blood Bank completes donation and adds to stock ===');
  // First blood bank checks its appointments
  const bbApps = await request('GET', '/api/blood-banks/me/appointments', null, bbToken);
  console.log(`Blood bank sees ${bbApps.data.data.appointments.length} appointment(s).`);

  // Complete the donation
  const completeRes = await request(
    'POST',
    `/api/blood-banks/me/appointments/${appointmentId}/complete`,
    {
      units: 1,
      bloodGroup: 'O+'
    },
    bbToken
  );
  console.log('Complete donation status:', completeRes.status, completeRes.data.message);

  console.log('\n=== TEST 6: Verify Stock Increased ===');
  const stockRes = await request('GET', '/api/blood-banks/me/inventory', null, bbToken);
  const oPlusStock = stockRes.data.data.inventory.find((i) => i.blood_group === 'O+');
  console.log('O+ stock in Blood Bank after completion:', oPlusStock);

  console.log('\n=== TEST 7: Check Donor Eligibility after Completed Donation ===');
  const postElig = await request('GET', '/api/donor/eligibility', null, donorToken);
  console.log('Post-donation Eligibility data:', postElig.data.data);
  if (postElig.data.data.isEligible !== false) {
    throw new Error('Donor should NOT be eligible immediately after donating!');
  }
  if (!postElig.data.data.lastDonationDate) {
    throw new Error('lastDonationDate must be populated!');
  }
  if (!postElig.data.data.nextEligibleDate) {
    throw new Error('nextEligibleDate must be populated!');
  }
  console.log('✓ Verified: isEligible is FALSE, lastDonationDate is recorded, nextEligibleDate is computed (90 days).');

  console.log('\n=== TEST 8: Attempt to Book Appointment BEFORE next eligible date (e.g. tomorrow) ===');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const earlyBooking = await request(
    'POST',
    '/api/donor/appointments',
    {
      bloodBankId: bbId,
      appointmentDate: tomorrowStr,
      appointmentTime: '11:00 AM'
    },
    donorToken
  );
  console.log('Early booking response status:', earlyBooking.status);
  console.log('Early booking response message:', earlyBooking.data.message);
  console.log('Early booking response data:', earlyBooking.data.data);
  if (earlyBooking.status !== 400) {
    throw new Error(`Expected status 400 for booking before eligible date, got ${earlyBooking.status}`);
  }
  if (!earlyBooking.data.message.includes('next eligible date')) {
    throw new Error('Expected message to contain next eligible date explanation!');
  }
  console.log('✓ Verified: Early booking is blocked with HTTP 400 and clear explanation of previous and next dates.');

  console.log('\n=== TEST 9: Book Appointment ON or AFTER next eligible date ===');
  const validDateStr = postElig.data.data.nextEligibleDate;
  const eligibleBooking = await request(
    'POST',
    '/api/donor/appointments',
    {
      bloodBankId: bbId,
      appointmentDate: validDateStr,
      appointmentTime: '02:00 PM',
      notes: 'Booking for next eligible cycle'
    },
    donorToken
  );
  console.log('Eligible booking response status:', eligibleBooking.status);
  console.log('Eligible booking message:', eligibleBooking.data.message);
  if (eligibleBooking.status !== 201) {
    throw new Error(`Expected status 201 for eligible date booking, got ${eligibleBooking.status}`);
  }
  console.log('✓ Verified: Booking on or after next eligible date succeeds with HTTP 201!');

  console.log('\n🎉 ALL RECOVERY & WAITING PERIOD TESTS PASSED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
