require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Seat = require('../models/Seat');
const Book = require('../models/Book');
const Booking = require('../models/Booking');
const Borrowing = require('../models/Borrowing');
const Notification = require('../models/Notification');
const Waitlist = require('../models/Waitlist');
const BookSuggestion = require('../models/BookSuggestion');
const Settings = require('../models/Settings');

const seed = async () => {
  try {
    await connectDB();
    console.log('🌱 Seeding database...\n');

    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      Seat.deleteMany({}),
      Book.deleteMany({}),
      Booking.deleteMany({}),
      Borrowing.deleteMany({}),
      Notification.deleteMany({}),
      Waitlist.deleteMany({}),
      BookSuggestion.deleteMany({}),
      Settings.deleteMany({})
    ]);
    console.log('🗑️  Cleared all collections');

    // ─── Settings ───
    await Settings.create({});
    console.log('⚙️  Settings created (defaults)');

    // ─── Users ───
    const users = await User.create([
      { name: 'Admin User', email: 'admin@library.com', password: 'Admin@123', role: 'admin', phone: '9876543210' },
      { name: 'Staff User', email: 'staff@library.com', password: 'Staff@123', role: 'staff', phone: '9876543211' },
      { name: 'Aarav Sharma', email: 'aarav@student.com', password: 'Student@123', role: 'student', studentId: 'STU001', phone: '9876543212' },
      { name: 'Priya Patel', email: 'priya@student.com', password: 'Student@123', role: 'student', studentId: 'STU002', phone: '9876543213' },
      { name: 'Rahul Kumar', email: 'rahul@student.com', password: 'Student@123', role: 'student', studentId: 'STU003', phone: '9876543214' }
    ]);
    console.log(`👤 Created ${users.length} users`);

    // ─── Seats ───
    const seats = [];

    // Silent zone: A1–A20 (4 rows × 5 cols)
    for (let r = 1; r <= 4; r++) {
      for (let c = 1; c <= 5; c++) {
        const num = (r - 1) * 5 + c;
        seats.push({
          seatCode: `A${num}`,
          zone: 'Silent',
          row: r,
          col: c,
          features: num % 3 === 0 ? ['power', 'quiet'] : num % 2 === 0 ? ['quiet'] : ['quiet', 'window']
        });
      }
    }

    // Reading zone: B1–B20 (4 rows × 5 cols)
    for (let r = 1; r <= 4; r++) {
      for (let c = 1; c <= 5; c++) {
        const num = (r - 1) * 5 + c;
        seats.push({
          seatCode: `B${num}`,
          zone: 'Reading',
          row: r,
          col: c,
          features: num % 4 === 0 ? ['power', 'window'] : num % 2 === 0 ? ['window'] : []
        });
      }
    }

    // Computer zone: C1–C10 (2 rows × 5 cols)
    for (let r = 1; r <= 2; r++) {
      for (let c = 1; c <= 5; c++) {
        const num = (r - 1) * 5 + c;
        seats.push({
          seatCode: `C${num}`,
          zone: 'Computer',
          row: r,
          col: c,
          features: ['power'] // All computer seats have power
        });
      }
    }

    // Group zone: D1–D10 (2 rows × 5 cols)
    for (let r = 1; r <= 2; r++) {
      for (let c = 1; c <= 5; c++) {
        const num = (r - 1) * 5 + c;
        seats.push({
          seatCode: `D${num}`,
          zone: 'Group',
          row: r,
          col: c,
          features: num <= 5 ? ['power'] : []
        });
      }
    }

    // Block a couple seats for demo
    seats[2].isBlocked = true;
    seats[2].blockReason = 'Under maintenance';
    seats[45].isBlocked = true;
    seats[45].blockReason = 'Chair broken';

    const createdSeats = await Seat.insertMany(seats);
    console.log(`💺 Created ${createdSeats.length} seats`);

    // ─── Books ───
    const books = await Book.create([
      // Programming
      { title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', category: 'Programming', tags: ['software', 'best-practices'], description: 'A Handbook of Agile Software Craftsmanship', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg', totalCopies: 3, availableCopies: 3, location: 'Shelf A1', publishedYear: 2008 },
      { title: 'JavaScript: The Good Parts', author: 'Douglas Crockford', isbn: '9780596517748', category: 'Programming', tags: ['javascript', 'web'], description: 'Most programming languages contain good and bad parts', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780596517748-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf A1', publishedYear: 2008 },
      { title: 'Design Patterns', author: 'Gang of Four', isbn: '9780201633610', category: 'Programming', tags: ['patterns', 'oop'], description: 'Elements of Reusable Object-Oriented Software', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780201633610-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf A2', publishedYear: 1994 },
      { title: 'The Pragmatic Programmer', author: 'David Thomas & Andrew Hunt', isbn: '9780135957059', category: 'Programming', tags: ['software', 'career'], description: 'Your Journey to Mastery', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf A2', publishedYear: 2019 },
      { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '9780262033848', category: 'Programming', tags: ['algorithms', 'data-structures'], description: 'The leading textbook on algorithms', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg', totalCopies: 4, availableCopies: 4, location: 'Shelf A3', publishedYear: 2009 },
      { title: 'You Don\'t Know JS', author: 'Kyle Simpson', isbn: '9781491950296', category: 'Programming', tags: ['javascript', 'deep-dive'], description: 'Up & Going series on JavaScript', coverUrl: 'https://covers.openlibrary.org/b/isbn/9781491950296-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf A1', publishedYear: 2015 },
      { title: 'Python Crash Course', author: 'Eric Matthes', isbn: '9781593279288', category: 'Programming', tags: ['python', 'beginner'], description: 'A Hands-On, Project-Based Introduction to Programming', coverUrl: 'https://covers.openlibrary.org/b/isbn/9781593279288-L.jpg', totalCopies: 3, availableCopies: 3, location: 'Shelf A1', publishedYear: 2019 },

      // Science
      { title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '9780553380163', category: 'Science', tags: ['physics', 'cosmology'], description: 'From the Big Bang to Black Holes', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg', totalCopies: 3, availableCopies: 3, location: 'Shelf B1', publishedYear: 1988 },
      { title: 'The Selfish Gene', author: 'Richard Dawkins', isbn: '9780199291151', category: 'Science', tags: ['biology', 'evolution'], description: 'A gene-centric view of evolution', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780199291151-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf B1', publishedYear: 1976 },
      { title: 'Cosmos', author: 'Carl Sagan', isbn: '9780345539434', category: 'Science', tags: ['astronomy', 'popular-science'], description: 'A Personal Voyage', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780345539434-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf B1', publishedYear: 1980 },
      { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316097', category: 'Science', tags: ['anthropology', 'history'], description: 'A Brief History of Humankind', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg', totalCopies: 3, availableCopies: 3, location: 'Shelf B2', publishedYear: 2011 },
      { title: 'The Structure of Scientific Revolutions', author: 'Thomas S. Kuhn', isbn: '9780226458120', category: 'Science', tags: ['philosophy-of-science'], description: 'Paradigm shifts in science', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780226458120-L.jpg', totalCopies: 1, availableCopies: 1, location: 'Shelf B2', publishedYear: 1962 },

      // Fiction
      { title: '1984', author: 'George Orwell', isbn: '9780451524935', category: 'Fiction', tags: ['dystopia', 'classic'], description: 'A dystopian social science fiction novel', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg', totalCopies: 4, availableCopies: 4, location: 'Shelf C1', publishedYear: 1949 },
      { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', category: 'Fiction', tags: ['classic', 'american'], description: 'A novel about racial injustice', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg', totalCopies: 3, availableCopies: 3, location: 'Shelf C1', publishedYear: 1960 },
      { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', category: 'Fiction', tags: ['classic', 'american'], description: 'A novel of the Jazz Age', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf C1', publishedYear: 1925 },
      { title: 'Brave New World', author: 'Aldous Huxley', isbn: '9780060850524', category: 'Fiction', tags: ['dystopia', 'classic'], description: 'A dystopian novel set in a futuristic World State', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf C2', publishedYear: 1932 },
      { title: 'The Alchemist', author: 'Paulo Coelho', isbn: '9780062315007', category: 'Fiction', tags: ['philosophical', 'adventure'], description: 'A magical story about following your dreams', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg', totalCopies: 3, availableCopies: 3, location: 'Shelf C2', publishedYear: 1988 },
      { title: 'Dune', author: 'Frank Herbert', isbn: '9780441172719', category: 'Fiction', tags: ['sci-fi', 'classic'], description: 'A science fiction novel about the desert planet Arrakis', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf C2', publishedYear: 1965 },

      // History
      { title: 'Guns, Germs, and Steel', author: 'Jared Diamond', isbn: '9780393354324', category: 'History', tags: ['civilization', 'anthropology'], description: 'The Fates of Human Societies', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780393354324-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf D1', publishedYear: 1997 },
      { title: 'The Art of War', author: 'Sun Tzu', isbn: '9781599869773', category: 'History', tags: ['strategy', 'ancient', 'military'], description: 'An ancient Chinese military treatise', coverUrl: 'https://covers.openlibrary.org/b/isbn/9781599869773-L.jpg', totalCopies: 3, availableCopies: 3, location: 'Shelf D1', publishedYear: -500 },
      { title: 'A People\'s History of the United States', author: 'Howard Zinn', isbn: '9780062397348', category: 'History', tags: ['american-history'], description: 'History from the perspective of common people', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780062397348-L.jpg', totalCopies: 1, availableCopies: 1, location: 'Shelf D1', publishedYear: 1980 },
      { title: 'The Diary of a Young Girl', author: 'Anne Frank', isbn: '9780553296983', category: 'History', tags: ['wwii', 'memoir'], description: 'The writings from the Dutch-language diary kept by Anne Frank', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780553296983-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf D1', publishedYear: 1947 },

      // Business
      { title: 'The Lean Startup', author: 'Eric Ries', isbn: '9780307887894', category: 'Business', tags: ['startup', 'innovation'], description: 'How Today\'s Entrepreneurs Use Continuous Innovation', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780307887894-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf E1', publishedYear: 2011 },
      { title: 'Zero to One', author: 'Peter Thiel', isbn: '9780804139298', category: 'Business', tags: ['startup', 'innovation'], description: 'Notes on Startups, or How to Build the Future', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780804139298-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf E1', publishedYear: 2014 },
      { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', isbn: '9780374533557', category: 'Business', tags: ['psychology', 'decision-making'], description: 'Two systems that drive the way we think', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg', totalCopies: 3, availableCopies: 3, location: 'Shelf E1', publishedYear: 2011 },
      { title: 'Rich Dad Poor Dad', author: 'Robert Kiyosaki', isbn: '9781612680194', category: 'Business', tags: ['finance', 'personal-development'], description: 'What the Rich Teach Their Kids About Money', coverUrl: 'https://covers.openlibrary.org/b/isbn/9781612680194-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf E1', publishedYear: 1997 },
      { title: 'Good to Great', author: 'Jim Collins', isbn: '9780066620992', category: 'Business', tags: ['management', 'leadership'], description: 'Why Some Companies Make the Leap and Others Don\'t', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780066620992-L.jpg', totalCopies: 1, availableCopies: 1, location: 'Shelf E2', publishedYear: 2001 },

      // Engineering
      { title: 'Engineering Mechanics: Statics', author: 'J.L. Meriam', isbn: '9781119392620', category: 'Engineering', tags: ['mechanics', 'statics'], description: 'A comprehensive guide to statics', coverUrl: 'https://covers.openlibrary.org/b/isbn/9781119392620-L.jpg', totalCopies: 3, availableCopies: 3, location: 'Shelf F1', publishedYear: 2018 },
      { title: 'Fluid Mechanics', author: 'Frank M. White', isbn: '9780073398273', category: 'Engineering', tags: ['fluids', 'mechanical'], description: 'Fundamentals of fluid mechanics', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780073398273-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf F1', publishedYear: 2015 },
      { title: 'Thermodynamics', author: 'Yunus A. Çengel', isbn: '9780073398174', category: 'Engineering', tags: ['thermodynamics', 'mechanical'], description: 'An Engineering Approach', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780073398174-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf F1', publishedYear: 2014 },
      { title: 'Digital Design', author: 'M. Morris Mano', isbn: '9780134549897', category: 'Engineering', tags: ['digital', 'electronics'], description: 'With an Introduction to the Verilog HDL', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780134549897-L.jpg', totalCopies: 3, availableCopies: 3, location: 'Shelf F2', publishedYear: 2017 },
      { title: 'Signals and Systems', author: 'Alan V. Oppenheim', isbn: '9780138147570', category: 'Engineering', tags: ['signals', 'electrical'], description: 'A comprehensive introduction to signals and systems', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780138147570-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf F2', publishedYear: 1996 },

      // Extra books to reach 40+
      { title: 'The Hitchhiker\'s Guide to the Galaxy', author: 'Douglas Adams', isbn: '9780345391803', category: 'Fiction', tags: ['sci-fi', 'comedy'], description: 'A humorous science fiction comedy series', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780345391803-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf C3', publishedYear: 1979 },
      { title: 'Atomic Habits', author: 'James Clear', isbn: '9780735211292', category: 'Business', tags: ['habits', 'self-improvement'], description: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg', totalCopies: 3, availableCopies: 3, location: 'Shelf E2', publishedYear: 2018 },
      { title: 'The Gene', author: 'Siddhartha Mukherjee', isbn: '9781476733524', category: 'Science', tags: ['genetics', 'biology'], description: 'An Intimate History', coverUrl: 'https://covers.openlibrary.org/b/isbn/9781476733524-L.jpg', totalCopies: 1, availableCopies: 1, location: 'Shelf B2', publishedYear: 2016 },
      { title: 'Steve Jobs', author: 'Walter Isaacson', isbn: '9781451648539', category: 'Business', tags: ['biography', 'technology'], description: 'The exclusive biography of Steve Jobs', coverUrl: 'https://covers.openlibrary.org/b/isbn/9781451648539-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf E2', publishedYear: 2011 },
      { title: 'Educated', author: 'Tara Westover', isbn: '9780399590504', category: 'History', tags: ['memoir', 'education'], description: 'A memoir about growing up in a survivalist family', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf D2', publishedYear: 2018 },
      { title: 'The C Programming Language', author: 'Brian W. Kernighan', isbn: '9780131103627', category: 'Programming', tags: ['c', 'systems'], description: 'The definitive reference for C programming', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780131103627-L.jpg', totalCopies: 2, availableCopies: 2, location: 'Shelf A3', publishedYear: 1988 },
      { title: 'Structure and Interpretation of Computer Programs', author: 'Harold Abelson', isbn: '9780262510875', category: 'Programming', tags: ['scheme', 'cs-fundamentals'], description: 'A classic CS textbook using Scheme', coverUrl: 'https://covers.openlibrary.org/b/isbn/9780262510875-L.jpg', totalCopies: 1, availableCopies: 1, location: 'Shelf A3', publishedYear: 1996 },
    ]);
    console.log(`📚 Created ${books.length} books`);

    // ─── Sample borrowings in various states ───
    const student1 = users[2]; // Aarav
    const student2 = users[3]; // Priya
    const staffUser = users[1];

    const now = new Date();
    const twoDaysAgo = new Date(now); twoDaysAgo.setDate(now.getDate() - 2);
    const fiveDaysAgo = new Date(now); fiveDaysAgo.setDate(now.getDate() - 5);
    const tenDaysAgo = new Date(now); tenDaysAgo.setDate(now.getDate() - 10);
    const threeDaysFromNow = new Date(now); threeDaysFromNow.setDate(now.getDate() + 3);
    const sevenDaysFromNow = new Date(now); sevenDaysFromNow.setDate(now.getDate() + 7);
    const twoDaysFromNow = new Date(now); twoDaysFromNow.setDate(now.getDate() + 2);

    // Decrement available copies for issued/approved books
    await Book.findByIdAndUpdate(books[0]._id, { availableCopies: 2 }); // Clean Code
    await Book.findByIdAndUpdate(books[7]._id, { availableCopies: 2 }); // Brief History
    await Book.findByIdAndUpdate(books[12]._id, { availableCopies: 3 }); // 1984

    const borrowings = await Borrowing.create([
      // Aarav: issued book (due in 3 days) — should show amber countdown
      {
        user: student1._id,
        book: books[0]._id,
        status: 'issued',
        requestedAt: tenDaysAgo,
        approvedBy: staffUser._id,
        approvedAt: tenDaysAgo,
        issuedBy: staffUser._id,
        issuedAt: tenDaysAgo,
        dueDate: threeDaysFromNow,
        renewCount: 0
      },
      // Priya: approved book (waiting for pickup)
      {
        user: student2._id,
        book: books[7]._id,
        status: 'approved',
        requestedAt: twoDaysAgo,
        approvedBy: staffUser._id,
        approvedAt: now,
        pickupDeadline: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      },
      // Priya: issued book (due in 7 days) — should show green countdown
      {
        user: student2._id,
        book: books[12]._id,
        status: 'issued',
        requestedAt: fiveDaysAgo,
        approvedBy: staffUser._id,
        approvedAt: fiveDaysAgo,
        issuedBy: staffUser._id,
        issuedAt: fiveDaysAgo,
        dueDate: sevenDaysFromNow,
        renewCount: 0
      }
    ]);
    console.log(`📖 Created ${borrowings.length} sample borrowings`);

    // ─── Sample notifications ───
    await Notification.create([
      { user: student1._id, title: 'Welcome!', message: 'Welcome to Smart Library! Start by booking a seat or browsing books.', type: 'system' },
      { user: student1._id, title: 'Book Due Soon', message: 'Your book "Clean Code" is due in 3 days. Please return it on time.', type: 'reminder' },
      { user: student2._id, title: 'Welcome!', message: 'Welcome to Smart Library! Start by booking a seat or browsing books.', type: 'system' },
      { user: student2._id, title: 'Book Ready', message: 'Your requested book "A Brief History of Time" has been approved. Please pick it up within 24 hours.', type: 'borrow' }
    ]);
    console.log('🔔 Created sample notifications');

    console.log('\n✅ Seed complete!\n');
    console.log('📋 Login credentials:');
    console.log('   Admin:   admin@library.com / Admin@123');
    console.log('   Staff:   staff@library.com / Staff@123');
    console.log('   Student: aarav@student.com / Student@123');
    console.log('   Student: priya@student.com / Student@123');
    console.log('   Student: rahul@student.com / Student@123\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

seed();
