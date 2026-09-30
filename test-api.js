async function test() {
  try {
    // Test login
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aarav@student.com', password: 'Student@123' })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginData);
    
    if (loginData.token) {
      // Get seats
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      const seatsRes = await fetch(`http://localhost:5000/api/seats?date=${dateStr}&startTime=09:00`, {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      const seatsData = await seatsRes.json();
      console.log('Seats:', seatsData.seats.slice(0, 5));
      
      // Try to book first available seat
      const availableSeat = seatsData.seats.find(s => s.status === 'available');
      if (availableSeat) {
        console.log('Booking seat:', availableSeat.seatCode, availableSeat._id);
        const bookingRes = await fetch('http://localhost:5000/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${loginData.token}` },
          body: JSON.stringify({ seatId: availableSeat._id, date: dateStr, startTime: '09:00' })
        });
        const bookingData = await bookingRes.json();
        console.log('Booking:', bookingData);
        
        if (bookingData.booking) {
          // Try to get QR
          const qrRes = await fetch(`http://localhost:5000/api/bookings/${bookingData.booking._id}/qr`, {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
          });
          const qrData = await qrRes.json();
          console.log('QR:', qrData.qrImage ? 'QR generated successfully!' : 'QR failed');
        }
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();