import { OpenAI } from 'openai'

const OPENAI_KEY = process.env.OPENAI_KEY;

if (!OPENAI_KEY) {
    console.error('❌ OPENAI_KEY не найден в переменных окружения. Убедитесь, что он установлен в .env файле.');
    process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_KEY })

export async function createAdvice(): Promise<string> {
    const chat = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: 'Ты спортивный тренер по плаванию. Дай краткий и полезный совет по плаванию или восстановлению после тренировки.' },
            { role: 'user', content: 'Дай совет по плаванию на сегодня' },
        ],
        model: 'gpt-4-turbo',
    })

    return chat.choices[0].message.content || 'Совет не получен'
}