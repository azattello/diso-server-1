const express = require('express');
const router = express.Router();
const User = require('../models/User');  // Подключаем модель пользователя

// Получение пользователей с рефералами с поддержкой поиска
router.get('/partners', async (req, res) => {
    try {
        const search = req.query.search || ''; // Параметр поиска из запроса

        // Если поиск по числу (например, номер телефона)
        const searchNumber = isNaN(Number(search)) ? null : Number(search);

        // Находим пользователей с рефералами и фильтруем по критериям поиска
        const usersWithReferrals = await User.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'referrer',
                    as: 'referrals'
                }
            },
            {
                $match: {
                    'referrals.0': { $exists: true }, // Убедиться, что у пользователя есть рефералы
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { surname: { $regex: search, $options: 'i' } },
                        { 
                            phone: searchNumber, // Поиск по телефону как числу
                        }
                    ]
                }
            }
        ]);

        res.json(usersWithReferrals);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении данных' });
    }
});



// Получение рефералов конкретного пользователя
router.get('/partners/:userId/referrals', async (req, res) => {
    try {
        // Ищем всех пользователей, у которых в поле referrer указан userId
        const referrals = await User.find({ referrer: req.params.userId });

        if (referrals.length === 0) {
            return res.status(404).json({ message: 'Рефералы не найдены' });
        }

        res.status(200).json(referrals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка при получении рефералов' });
    }
});
// Обновление процента пользователя
router.put('/partners/:userId/percent', async (req, res) => {
    const { userId } = req.params;  // Изменено на userId
    const { percent } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'Неверный формат идентификатора пользователя' });
    }

    try {
        const user = await User.findById(userId); // Используем userId
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        user.referralBonusPercentage = percent !== undefined ? percent : null;  // Проверка процента
        await user.save();

        res.status(200).json({ message: 'Процент обновлен' });
    } catch (error) {
        console.error('Ошибка при обновлении процента пользователя:', error);
        res.status(500).json({ message: 'Ошибка при обновлении процента' });
    }
});


// Изменение бонусов пользователя
router.put('/partners/:userId/bonuses', async (req, res) => {
    const { bonuses } = req.body;
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        user.bonuses = bonuses;
        await user.save();
        res.json({ message: 'Бонусы обновлены', user });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении бонусов' });
    }
});



// Получение глобального процента
router.get('/api/settings/globalBonus', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.status(200).json({ globalReferralBonusPercentage: settings.globalReferralBonusPercentage });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении настроек' });
    }
});


module.exports = router;
