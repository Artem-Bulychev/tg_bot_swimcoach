import TelegramBot from 'node-telegram-bot-api'
import User from '../../backend/models/User'

export default function setupCommands(bot: TelegramBot) {
    bot.onText(/\/profile/, async (msg) => {
        const chatId = msg.chat.id
        try {
            const user = await User.findOne({ chatId })
            if (!user) {
                bot.sendMessage(chatId, 'Пользователь не найден. Сначала используй /start')
                return
            }
            // Добавим информацию о подписке в профиль
            let profileText = `👤 Профиль:\nЦель: ${user.goal}\nДень: ${user.dayIndex}\nПремиум: ${user.premium ? 'Да' : 'Нет'}`
            if (user.premium && user.premiumUntil) {
                profileText += `\nПодписка до: ${user.premiumUntil.toLocaleDateString('ru-RU')}`
            }
            bot.sendMessage(chatId, profileText)
        } catch (err) {
            console.error('Ошибка при получении профиля:', err)
            bot.sendMessage(chatId, 'Ошибка при получении данных. Попробуйте позже.')
        }
    })
}