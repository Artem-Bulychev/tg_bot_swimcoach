import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from '../models/User'

dotenv.config()

async function run() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not defined')
    }

    await mongoose.connect(process.env.MONGO_URI)

    await User.create({
        chatId: '123456789',
        goal: 'Пробежать 5км за 4 недели',
        dayIndex: 3,
        premium: true,
    })

    console.log('Тестовый пользователь добавлен')
    process.exit(0)
}

run().catch(err => {
    console.error('Error:', err)
    process.exit(1)
})
