const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true
  },
  isbn: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Programming', 'Science', 'Fiction', 'History', 'Business', 'Engineering', 'Mathematics', 'Philosophy', 'Art', 'Other']
  },
  tags: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    default: ''
  },
  coverUrl: {
    type: String,
    default: ''
  },
  totalCopies: {
    type: Number,
    required: true,
    min: 0,
    default: 1
  },
  availableCopies: {
    type: Number,
    required: true,
    min: 0,
    default: 1
  },
  location: {
    type: String,
    default: '',
    trim: true
  },
  publishedYear: {
    type: Number
  }
}, {
  timestamps: true
});

// Text index for search
bookSchema.index({ title: 'text', author: 'text', tags: 'text' });

module.exports = mongoose.model('Book', bookSchema);
