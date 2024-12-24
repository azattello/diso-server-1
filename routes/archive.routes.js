const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const Track = require('../models/Track');
const Archive = require('../models/Archive');
const Settings = require('../models/Settings');

// Функция для поиска трека по номеру и добавления в архив
const findTrackAndAddToArchive = async (userId, trackNumber) => {
    try {
        // Находим трек по его номеру
        const track = await Track.findOne({ track: trackNumber });

        // Если трек не найден, возвращаем ошибку 404
        if (!track) {
            throw new Error('Трек не найден');
        }

        // Создаем новый объект для архива
        const newArchive = new Archive({
            trackNumber: trackNumber,
            user: userId,
            history: track.history
        });

        // Сохраняем трек в архив
        await newArchive.save();

        // Удаляем трек из основного списка
        await Track.deleteOne({ track: trackNumber });

        console.log(`Трек ${trackNumber} успешно добавлен в архив и удален из основного списка`);

        return true;
    } catch (error) {
        console.error('Ошибка при добавлении трека в архив:', error.message);
        return false;
    }
};

// Роут для архивирования закладок
router.post('/:userId/archive', async (req, res) => {
    const { userId } = req.params; // Получаем ID пользователя из параметров маршрута
    const { bookmarksToArchive } = req.body; // Получаем закладки для архивирования из тела запроса

    // Проверяем, является ли userId валидным ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Неверный формат идентификатора пользователя' });
    }

    try {
        // Находим пользователя по его userId
        const user = await User.findById(userId);

        // Если пользователь не найден, возвращаем ошибку
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Проверяем, что bookmarksToArchive — это массив
        if (!Array.isArray(bookmarksToArchive)) {
            return res.status(400).json({ message: 'Неверный формат данных для архивирования закладок' });
        }

        let totalPrice = 0; // Переменная для хранения общей суммы всех цен треков

        // Проходим по каждому элементу из массива bookmarksToArchive
        for (const bookmark of bookmarksToArchive) {
            const { trackNumber, description } = bookmark; // Получаем данные закладки
            const track = await Track.findOne({ track: trackNumber }); // Находим трек по его номеру

            if (track) {
                if (track.price) {
                    totalPrice += parseFloat(track.price); // Если у трека есть цена, добавляем её к общей стоимости
                }

                // Создаем объект архивированной закладки
                const archiveBookmark = {
                    trackNumber,
                    description,
                    history: track.history, // История трека
                    price: track.price,
                    weight: track.weight,
                    user: track.user,
                };

                // Добавляем закладку в архив пользователя
                user.archive.push(archiveBookmark);

                // Удаляем закладку из активных закладок пользователя
                user.bookmarks = user.bookmarks.filter(b => b.trackNumber !== trackNumber);
                
                // Устанавливаем флаг confirmed в true для трека
                track.confirmed = true;
                await track.save();
            }
        }

        // Находим глобальные настройки, чтобы получить общий процент рефералов
        const settings = await Settings.findOne();
        const globalBonusPercentage = settings ? parseFloat(settings.globalReferralBonusPercentage) : 0;

        let userBonusPercentage; // Переменная для хранения процента бонуса

        // Проверяем, есть ли у пользователя реферер
        if (user.referrer) {
            // Находим реферера пользователя
            const referrer = await User.findById(user.referrer);
            
            // Если реферер найден и у него есть персональный процент, используем его
            if (referrer && referrer.referralBonusPercentage !== null) {
                userBonusPercentage = referrer.referralBonusPercentage;
            } else {
                // Если у реферера нет персонального процента, используем глобальный процент
                userBonusPercentage = globalBonusPercentage;
            }
        } else {
            // Если у пользователя нет реферера, используем глобальный процент
            userBonusPercentage = globalBonusPercentage;
        }

        // Рассчитываем бонусы, умножая общую сумму на процент бонуса
        const bonusAmount = parseFloat((totalPrice * (userBonusPercentage / 100)).toFixed(1));


        // Если у пользователя есть реферер, добавляем бонус этому рефереру
        if (user.referrer) {
            const referrer = await User.findById(user.referrer);
            if (referrer) {
                // Обновляем бонусы реферера
                referrer.bonuses = (referrer.bonuses || 0) + bonusAmount;
                await referrer.save(); // Сохраняем обновлённого реферера в базе данных
            }
        }

        // Сохраняем изменения пользователя в базе данных
        await user.save();
        return res.status(200).json({ message: 'Закладки успешно архивированы' });
    } catch (error) {
        console.error('Ошибка при архивировании закладок:', error.message);
        return res.status(500).json({ message: 'Произошла ошибка при архивировании закладок' });
    }
});




// Роут для получения всех записей из архива пользователя
router.get('/:userId/getArchive', async (req, res) => {
    const { userId } = req.params;

    try {
        // Находим пользователя по его идентификатору
        const user = await User.findById(userId);

        // Если пользователь не найден, возвращаем ошибку 404
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Возвращаем записи из архива пользователя
        return res.status(200).json(user.archive);
    } catch (error) {
        console.error('Ошибка при получении записей из архива:', error.message);
        return res.status(500).json({ message: 'Произошла ошибка при получении записей из архива' });
    }
});


// DELETE запрос для удаления трека из архива пользователя
router.delete('/:userId/delete/:trackNumber', async (req, res) => {
    const { userId, trackNumber } = req.params;

    try {
        // Находим пользователя по его идентификатору
        const user = await User.findById(userId);

        // Если пользователь не найден, возвращаем ошибку 404
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Находим индекс архивного трека в массиве archive пользователя
        const index = user.archive.findIndex(item => item.trackNumber === trackNumber);

        // Если трек не найден в архиве, возвращаем ошибку 404
        if (index === -1) {
            return res.status(404).json({ message: 'Трек не найден в архиве' });
        }

        // Удаляем трек из массива archive
        user.archive.splice(index, 1);

        // Сохраняем изменения
        await user.save();

        return res.status(200).json({ message: 'Трек успешно удален из архива пользователя' });
    } catch (error) {
        console.error('Ошибка при удалении трека из архива:', error.message);
        return res.status(500).json({ message: 'Произошла ошибка при удалении трека из архива' });
    }
});


module.exports = router;
