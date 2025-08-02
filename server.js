import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import connectDB from './config/db.js';
import userRoutes from './routes/authRoutes.js'
import contractorsRoutes from './routes/contractorRoutes.js'
import bookmarksRoutes from './routes/bookmarsRoutes.js'



// Load env variables
dotenv.config();


const app = express()
connectDB();



// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // To parse JSON bodies


// Test route
app.get('/', (req, res) => {
  res.send('API is running...');
});


app.use("/api/v1",userRoutes)
app.use("/api/v1",contractorsRoutes)
app.use("/api/v1",bookmarksRoutes)

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));