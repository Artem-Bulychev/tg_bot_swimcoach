import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
    chatId: number
    goal: string
    plan: string[]
    startDate: Date
    dayIndex: number
    premium: boolean
}

const UserSchema = new Schema<IUser>({
    chatId: { type: Number, required: true, unique: true },
    goal: String,
    plan: [String],
    startDate: Date,
    dayIndex: { type: Number, default: 0 }, // <--- ИЗМЕНЕНО: Добавлено значение по умолчанию
    premium: { type: Boolean, default: false }, // <--- ИЗМЕНЕНО: Добавлено значение по умолчанию
}, {
    timestamps: true // <--- ИЗМЕНЕНО: Добавлены отметки времени создания/обновления
})

export default mongoose.model<IUser>('User', UserSchema)