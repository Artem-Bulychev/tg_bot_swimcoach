import TelegramBot, { ReplyKeyboardMarkup } from 'node-telegram-bot-api'
import mongoose from 'mongoose'
import cron from 'node-cron'
import setupCommands from './handlers/commands'
import { generatePlan } from './services/planGenerator'
import { createAdvice } from './services/aiAdvice'
import User from '../backend/models/User'

console.log('TG_TOKEN:', process.env.TG_TOKEN)
console.log('MONGO_URI:', process.env.MONGO_URI)

// Отключаем буферизацию команд Mongoose
mongoose.set('bufferCommands', false);

const goalsKeyboard: ReplyKeyboardMarkup = {
    keyboard: [[
        { text: 'Похудеть' },
        { text: '1 км в бассейне' },
        { text: 'Железная дистанция' }
    ]],
    one_time_keyboard: true,
    resize_keyboard: true
}

const startBot = (bot: TelegramBot) => {
    console.log('🤖 Bot is ready')

    bot.onText(/\/start/, async (msg) => {
        await bot.sendMessage(
            msg.chat.id,
            'Привет! Укажи свою цель в плавании:\n1. Похудеть\n2. Проплыть 1 км в бассейне\n3. Подготовиться к Железной дистанции (Ironman)',
            { reply_markup: goalsKeyboard }
        )
    })

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id
        const text = msg.text ?? ''

        const goals = ['Похудеть', '1 км в бассейне', 'Железная дистанция']

        if (goals.includes(text)) {
            const plan = generatePlan(text, 'новичок')
            console.log('Saving user:', { chatId, goal: text, plan })

            try {
                let user = await User.findOne({ chatId });

                if (!user) {
                    user = new User({
                        chatId,
                        goal: text,
                        plan,
                        startDate: new Date(),
                        dayIndex: 0,
                        premium: false
                    });
                    await user.save();
                    console.log('🎉 New user created:', user);
                } else {
                    user.goal = text;
                    user.plan = plan;
                    user.startDate = new Date();
                    user.dayIndex = 0;
                    user.premium = false;
                    await user.save();
                    console.log('🔄 Existing user updated:', user);
                }

                await bot.sendMessage(chatId, 'Твой план готов! Используй /plan чтобы его посмотреть.')
            } catch (err) {
                console.error('❌ save user error:', err)
                await bot.sendMessage(chatId, 'Ошибка при сохранении данных. Попробуйте позже.')
            }
        }
    })

    bot.onText(/\/plan/, async (msg) => {
        try {
            const user = await User.findOne({ chatId: msg.chat.id })
            if (!user) return bot.sendMessage(msg.chat.id, 'Сначала выбери цель через /start')

            const resp = 'Твоя программа на 4 недели:\n' +
                user.plan.map((d, i) => `${i + 1}. ${d}`).join('\n')
            bot.sendMessage(msg.chat.id, resp)
        } catch (err) {
            console.error('Ошибка при получении плана:', err)
            bot.sendMessage(msg.chat.id, 'Ошибка при получении данных. Попробуйте позже.')
        }
    })

    bot.onText(/\/done/, async (msg) => {
        try {
            const user = await User.findOne({ chatId: msg.chat.id })
            if (!user) return bot.sendMessage(msg.chat.id, 'Сначала выбери цель через /start')

            user.dayIndex++
            await user.save()
            bot.sendMessage(msg.chat.id, `Отлично! Ты завершил ${user.dayIndex} тренировок.`)
        } catch (err) {
            console.error('Ошибка при обновлении тренировки:', err)
            bot.sendMessage(msg.chat.id, 'Ошибка при обновлении данных. Попробуйте позже.')
        }
    })

    bot.onText(/\/advice/, async (msg) => {
        try {
            const tip = await createAdvice()
            bot.sendMessage(msg.chat.id, `Совет дня: ${tip}`)
        } catch (err) {
            console.error('Ошибка при получении совета:', err)
            bot.sendMessage(msg.chat.id, 'Не удалось получить совет. Попробуйте позже.')
        }
    })

    cron.schedule('0 9 * * *', async () => {
        try {
            const users = await User.find()
            for (const u of users) {
                const training = u.plan[u.dayIndex] || 'Отдых'
                bot.sendMessage(u.chatId, `Привет! Твоя тренировка на сегодня: ${training}`)
            }
        } catch (err) {
            console.error('Ошибка при отправке ежедневных напоминаний:', err)
        }
    })
}

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/defaultDB', {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 20,
})
    .then(() => {
        console.log('✅ MongoDB connected')

        const bot = new TelegramBot(process.env.TG_TOKEN || '', { polling: true })

        setupCommands(bot)
        startBot(bot)
    })
    .catch(err => console.error('❌ Mongo connection error:', err))