import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
    chatId: number
    goal: string
    plan: string[]
    startDate: Date
    dayIndex: number
    premium: boolean
    premiumUntil?: Date
}

const UserSchema = new Schema<IUser>({
    chatId: { type: Number, required: true, unique: true },
    goal: { type: String, default: 'нет цели' },
    plan: { type: [String], default: [] },
    startDate: { type: Date, default: Date.now },
    dayIndex: { type: Number, default: 0 },
    premium: { type: Boolean, default: false },
    premiumUntil: { type: Date, required: false }
}, {
    timestamps: true
})

export default mongoose.model<IUser>('User', UserSchema)