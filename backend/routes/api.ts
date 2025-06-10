import { Router, Request, Response } from 'express'
import User from '../models/User'

const router = Router()

router.get('/users', async (req: Request, res: Response) => {
    try {
        const users = await User.find()
        res.json(users)
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' })
    }
})

export default router
