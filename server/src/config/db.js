const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/internsync';
  return mongoose.connect(uri);
};

module.exports = connectDB;
