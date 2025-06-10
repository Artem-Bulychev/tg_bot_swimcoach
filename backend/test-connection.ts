import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const connectToMongo = async (): Promise<void> => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in environment variables')
        }

        await mongoose.connect(process.env.MONGO_URI)
        console.log('✅ Успешно подключено к MongoDB')
        process.exit(0)
    } catch (err) {
        if (err instanceof Error) {
            console.error('❌ Ошибка подключения:', err.message)
        } else {
            console.error('❌ Неизвестная ошибка подключения')
        }
        process.exit(1)
    }
}

connectToMongo()
