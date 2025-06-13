// import 'dotenv/config'
import TelegramBot, { ReplyKeyboardMarkup, InlineKeyboardMarkup } from 'node-telegram-bot-api'
import mongoose from 'mongoose'
import cron from 'node-cron'
import setupCommands from './handlers/commands'
import { generatePlan } from './services/planGenerator'
import { createAdvice } from './services/aiAdvice'
import User from '../backend/models/User'

console.log('TG_TOKEN:', process.env.TG_TOKEN)
console.log('MONGO_URI:', process.env.MONGO_URI)
// TODO: Переместить PAYMENT_PROVIDER_TOKEN в .env
console.log('PAYMENT_PROVIDER_TOKEN:', process.env.PAYMENT_PROVIDER_TOKEN ? 'Загружен' : 'НЕ ЗАГРУЖЕН');


mongoose.set('bufferCommands', false);

// Кнопка для покупки подписки
const buySubscriptionKeyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
        [{ text: 'Купить подписку на 1 месяц (1000 руб)', callback_data: 'buy_subscription_1_month' }]
    ]
}

const TRAINER_USERNAME = '@nashamasha00';

const startBot = (bot: TelegramBot) => {
    console.log('🤖 Bot is ready')

    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const user = await User.findOne({ chatId });

        let welcomeMessage = 'Привет! Я твой персональный тренер по плаванию SwimCoach.\n';

        if (user && user.premium && user.premiumUntil && user.premiumUntil > new Date()) {
            welcomeMessage += `Твоя подписка активна до ${user.premiumUntil.toLocaleDateString('ru-RU')}. Можешь использовать /plan, /advice и /done.`
        } else {
            welcomeMessage += `Чтобы получить персональный план тренировок и советы, тебе нужна подписка. Приобрети ее, и я дам тебе контакт твоего тренера ${TRAINER_USERNAME}!\n\n`;
            welcomeMessage += `Цена: 1000 руб/месяц.`;
        }

        await bot.sendMessage(
            chatId,
            welcomeMessage,
            { reply_markup: user && user.premium ? undefined : buySubscriptionKeyboard }
        );
    });

    // Обработка кнопки "Купить подписку"
    bot.on('callback_query', async (query) => {
        const chatId = query.message?.chat.id;
        if (!chatId) return;

        if (query.data === 'buy_subscription_1_month') {
            const price = 100000;
            const title = 'Подписка на 1 месяц SwimCoach';
            const description = 'Персональные планы тренировок и советы по плаванию на 1 месяц.';
            const payload = 'swimcoach_1_month_subscription';
            const currency = 'RUB';

            // Проверяем наличие токена платежного провайдера
            const paymentProviderToken = process.env.PAYMENT_PROVIDER_TOKEN;
            if (!paymentProviderToken) {
                console.error('PAYMENT_PROVIDER_TOKEN не установлен в .env');
                return bot.sendMessage(chatId, 'Извините, сейчас невозможно принять оплату. Попробуйте позже.');
            }

            try {
                // Создаем счет
                await bot.sendInvoice(
                    chatId,
                    title,
                    description,
                    payload,
                    paymentProviderToken,
                    'unique-start-parameter',
                    [
                        { label: '1 месяц подписки', amount: price }
                    ],
                    {
                        need_name: true,
                        need_phone_number: false,
                        need_email: false,
                        need_shipping_address: false,
                        is_flexible: false,
                        // provider_data: {} // Если нужен специфичные данные для провайдера
                    }
                );
            } catch (error) {
                console.error('Ошибка при отправке счета:', error);
                bot.sendMessage(chatId, 'Не удалось создать счет. Попробуйте позже.');
            }
        }
    });

    // ОБРАБОТКА ПЛАТЕЖЕЙ

    bot.on('pre_checkout_query', async (query) => {
        try {
            // В случае успеха:
            await bot.answerPreCheckoutQuery(query.id, true);
        } catch (error) {
            console.error('Ошибка в pre_checkout_query:', error);
            await bot.answerPreCheckoutQuery(query.id, false, { error_message: 'Что-то пошло не так при подготовке к оплате.' });
        }
    });

    // Обработка успешной оплаты
    bot.on('successful_payment', async (msg) => {
        const chatId = msg.chat.id;
        const totalAmount = msg.successful_payment?.total_amount;
        const currency = msg.successful_payment?.currency;
        const invoicePayload = msg.successful_payment?.invoice_payload;

        console.log(`🎉 Успешная оплата от ${chatId}! Сумма: ${totalAmount} ${currency}. Payload: ${invoicePayload}`);

        try {
            let user = await User.findOne({ chatId });
            if (!user) {
                // Если пользователь не найден (что странно после успешной оплаты), создаем его
                user = new User({ chatId });
            }

            // Устанавливаем премиум статус и дату окончания
            user.premium = true;
            const now = new Date();
            user.premiumUntil = new Date(now.setMonth(now.getMonth() + 1)); // Подписка на 1 месяц

            // Если это первая покупка, можно сгенерировать план сразу
            if (user.plan.length === 0) {
                // Важно: generatePlan теперь асинхронный и генерирует AI-план
                user.plan = await generatePlan(user.goal || 'общая физическая подготовка', 'новичок');
            }

            await user.save();

            // Сообщение пользователю
            await bot.sendMessage(
                chatId,
                `🎉 Поздравляем! Ваша подписка активна до ${user.premiumUntil.toLocaleDateString('ru-RU')}.`
            );
            await bot.sendMessage(
                chatId,
                `Теперь у вас есть доступ к персональным тренировкам и советам. Ваш персональный тренер: ${TRAINER_USERNAME}. Напишите ему, чтобы обсудить детали!`
            );
        } catch (err) {
            console.error('❌ Ошибка при обработке успешной оплаты:', err);
            bot.sendMessage(chatId, 'Произошла ошибка при активации вашей подписки. Пожалуйста, свяжитесь с поддержкой.');
        }
    });

    // ----- ЗАЩИЩЕННЫЕ КОМАНДЫ ДЛЯ ПРЕМИУМ-ПОЛЬЗОВАТЕЛЕЙ -----

    const checkPremium = async (chatId: number): Promise<boolean> => {
        const user = await User.findOne({ chatId });
        if (!user || !user.premium || !user.premiumUntil || user.premiumUntil <= new Date()) {
            bot.sendMessage(chatId, 'Эта функция доступна только для премиум-пользователей. Приобретите подписку, используя команду /start.');
            return false;
        }
        return true;
    }

    bot.onText(/\/plan/, async (msg) => {
        const chatId = msg.chat.id;
        if (!await checkPremium(chatId)) return;

        try {
            const user = await User.findOne({ chatId: msg.chat.id })
            if (!user) { // Дополнительная проверка, хотя checkPremium уже ее сделал
                return bot.sendMessage(msg.chat.id, 'Пользователь не найден. Пожалуйста, свяжитесь с поддержкой.');
            }

            // Если план еще не сгенерирован (например, если пользователь был премиум, но не выбрал цель)
            if (user.plan.length === 0) {
                user.plan = await generatePlan(user.goal || 'общая физическая подготовка', 'новичок');
                await user.save();
            }

            const resp = 'Твоя программа на 4 недели:\n' +
                user.plan.map((d, i) => `${i + 1}. ${d}`).join('\n')
            bot.sendMessage(msg.chat.id, resp)
        } catch (err) {
            console.error('Ошибка при получении плана:', err)
            bot.sendMessage(msg.chat.id, 'Ошибка при получении данных. Попробуйте позже.')
        }
    })

    bot.onText(/\/done/, async (msg) => {
        const chatId = msg.chat.id;
        if (!await checkPremium(chatId)) return;

        try {
            const user = await User.findOne({ chatId: msg.chat.id })
            if (!user) return bot.sendMessage(msg.chat.id, 'Пользователь не найден. Пожалуйста, свяжитесь с поддержкой.');

            user.dayIndex++
            await user.save()
            bot.sendMessage(msg.chat.id, `Отлично! Ты завершил ${user.dayIndex} тренировок.`)
        } catch (err) {
            console.error('Ошибка при обновлении тренировки:', err)
            bot.sendMessage(msg.chat.id, 'Ошибка при обновлении данных. Попробуйте позже.')
        }
    })

    bot.onText(/\/advice/, async (msg) => {
        const chatId = msg.chat.id;
        if (!await checkPremium(chatId)) return;

        try {
            const tip = await createAdvice()
            bot.sendMessage(chatId, `Совет дня: ${tip}`)
        } catch (err) {
            console.error('Ошибка при получении совета:', err)
            bot.sendMessage(chatId, 'Не удалось получить совет. Попробуйте позже.')
        }
    })

    // Крон-задача только для премиум-пользователей
    cron.schedule('0 9 * * *', async () => {
        try {
            const users = await User.find({ premium: true, premiumUntil: { $gt: new Date() } }) // Только активные премиум пользователи
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