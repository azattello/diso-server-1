const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Track = require('../models/Track');
const Settings = require('../models/Settings'); // Импортируем модель Settings

// Роут для прикрепления трек-номера к аккаунту пользователя
router.post('/:userId/bookmarks', async (req, res) => {
    const { userId } = req.params;
    const { description, trackNumber } = req.body;

    try {
        // Находим пользователя по его идентификатору
        const user = await User.findById(userId);

        // Если пользователь не найден, возвращаем ошибку 404
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Проверяем, существует ли трек-номер в закладках пользователя
        const isTrackNumberExists = user.bookmarks.some(bookmark => bookmark.trackNumber === trackNumber);

        if (isTrackNumberExists) {
            return res.status(400).json({ message: 'Трек-номер уже существует в закладках' });

        }

        // Создаем новый объект с информацией о трек-номере
        const newBookmark = {
            description,
            trackNumber
        };

        // Добавляем новый трек-номер в закладки пользователя
        user.bookmarks.push(newBookmark);

        // Сохраняем обновленного пользователя в базу данных
        await user.save();

        // Возвращаем успешный ответ
        return res.status(201).json({ message: 'Трек-номер успешно прикреплен к пользователю', bookmark: newBookmark });
    } catch (error) {
        console.error('Ошибка при прикреплении трек-номера к пользователю:', error.message);
        return res.status(500).json({ message: 'Произошла ошибка при прикреплении трек-номера к пользователю' });
    }
});


// Роут для получения закладок клиента
router.get('/:userId/getBookmarks', async (req, res) => {
    const { userId } = req.params;

    try {
        // Находим пользователя по его идентификатору
        const user = await User.findById(userId);

        // Если пользователь не найден, возвращаем ошибку 404
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Получаем настройки для цены и валюты
        const settings = await Settings.findOne();

        // Получаем список закладок пользователя
        const bookmarks = user.bookmarks;

        // Создаем массив для не найденных треков
        let notFoundBookmarks = [];

        // Создаем массив для обновленных закладок
        let updatedBookmarks = [];

        // Проходимся по закладкам пользователя
        for (const bookmark of bookmarks) {
            const formattedTrackNumber = bookmark.trackNumber.replace(/\s+/g, '').toLowerCase();

            // Ищем трек в базе данных по его отформатированному номеру
            const track = await Track.findOne({
                track: { $regex: new RegExp(formattedTrackNumber, 'i') }
            });

            if (!track) {
                notFoundBookmarks.push({ 
                    trackNumber: bookmark.trackNumber, 
                    currentStatus: null, 
                    createdAt: bookmark.createdAt, 
                    description: bookmark.description,
                });
            } else {

                bookmark.trackId = track._id;
                bookmark.currentStatus = track.status;

                // Обновляем информацию о закладке в базе данных
                await User.updateOne(
                    { _id: userId, 'bookmarks._id': bookmark._id },
                    {
                        $set: {
                            'bookmarks.$.trackId': track._id,
                            'bookmarks.$.currentStatus': track.status,
                        }
                    }
                );

                // Обновляем поле user в модели трека
                await Track.updateOne(
                    { _id: track._id },
                    { $set: { user: user.phone } }
                );

                // Добавляем дополнительные данные в обновленные закладки
                updatedBookmarks.push({
                    trackNumber: bookmark.trackNumber,
                    currentStatus: track.status,
                    description: bookmark.description,
                    history: track.history
                });
            }
        }

        // Возвращаем результат
        return res.status(200).json({ notFoundBookmarks, updatedBookmarks });
    } catch (error) {
        console.error('Ошибка при получении закладок пользователя:', error.message);
        return res.status(500).json({ message: 'Произошла ошибка при получении закладок пользователя' });
    }
});




// Роут для удаления закладки
router.delete('/:userId/delete/:trackNumber', async (req, res) => {
    const { userId, trackNumber } = req.params;

    try {
        // Находим пользователя по его идентификатору
        const user = await User.findById(userId);

        // Если пользователь не найден, возвращаем ошибку 404
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Находим индекс закладки в массиве по её номеру трека
        const index = user.bookmarks.findIndex(b => b.trackNumber === trackNumber);

        // Если закладка не найдена, возвращаем ошибку 404
        if (index === -1) {
            return res.status(404).json({ message: 'Закладка не найдена' });
        }

        // Удаляем закладку из массива закладок пользователя
        user.bookmarks.splice(index, 1);

        // Сохраняем изменения в базе данных
        await user.save();

        // Возвращаем успешный ответ
        return res.status(200).json({ message: 'Закладка успешно удалена' });
    } catch (error) {
        console.error('Ошибка при удалении закладки:', error.message);
        return res.status(500).json({ message: 'Произошла ошибка при удалении закладки' });
    }
});



module.exports = router;


