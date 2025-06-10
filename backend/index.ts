import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import apiRouter from './routes/api'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined')
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err))

app.use('/api', apiRouter)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Admin API running on port ${PORT}`)
})
