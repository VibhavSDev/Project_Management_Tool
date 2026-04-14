import mongoose from 'mongoose';
import dns from "node:dns";

dns.setServers([
    '1.1.1.1',
    '8.8.8.8'
]);

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("Error connecting to MONGODB", err.message);
    process.exit(1);
  }
};
