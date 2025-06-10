import TelegramBot from 'node-telegram-bot-api'
import User from '../../backend/models/User'

export default function setupCommands(bot: TelegramBot) {
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id

        try {
            await User.findOneAndUpdate(
                { chatId },
                { $setOnInsert: { chatId, goal: 'начать плавать', dayIndex: 0, premium: false } },
                { upsert: true, new: true }
            )

            bot.sendMessage(chatId, '🏊‍♀️ Добро пожаловать в SwimCoach! Чтобы получить персональный план — напиши свою цель, например: "Хочу проплыть 1 км"')
        } catch (err) {
            console.error('Ошибка при сохранении пользователя:', err)
            bot.sendMessage(chatId, 'Произошла ошибка, попробуйте позже.')
        }
    })

    bot.onText(/\/profile/, async (msg) => {
        const chatId = msg.chat.id
        try {
            const user = await User.findOne({ chatId })
            if (!user) {
                bot.sendMessage(chatId, 'Пользователь не найден. Сначала используй /start')
                return
            }
            bot.sendMessage(chatId, `👤 Профиль:\nЦель: ${user.goal}\nДень: ${user.dayIndex}\nПремиум: ${user.premium ? 'Да' : 'Нет'}`)
        } catch (err) {
            console.error('Ошибка при получении профиля:', err)
            bot.sendMessage(chatId, 'Ошибка при получении данных. Попробуйте позже.')
        }
    })
}