const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Track = require('../models/Track');
const { getUserBookmarks } = require('../middleware/bookmarks.middleware');
const { getUserArchive } = require('../middleware/archive.middleware');

// Маршрут для получения закладок по userId
router.get('/bookmarks/:userId', getUserBookmarks);

// Маршрут для получения архива по userId
router.get('/archives/:userId', getUserArchive);

// Роут для прикрепления трек-номера к аккаунту пользователя
router.post('/:userId/bookmarks', async (req, res) => {
    const { userId } = req.params;
    const { description, trackNumber } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Проверяем, не существует ли уже закладка с таким трек-номером
        if (user.bookmarks.some(b => b.trackNumber.toLowerCase() === trackNumber.toLowerCase())) {
            return res.status(400).json({ message: 'Закладка с таким трек-номером уже существует' });
        }

        const newBookmark = { description, trackNumber };
        user.bookmarks.push(newBookmark);
        await user.save();

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
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const bookmarks = user.bookmarks;
        let notFoundBookmarks = [];
        let updatedBookmarks = [];

        await Promise.all(bookmarks.map(async (bookmark) => {
            const formattedTrackNumber = bookmark.trackNumber.replace(/\s+/g, '').toLowerCase();
            const track = await Track.findOne({ track: { $regex: new RegExp(formattedTrackNumber, 'i') } });

            if (!track) {
                notFoundBookmarks.push({
                    trackNumber: bookmark.trackNumber,
                    currentStatus: null,
                    createdAt: bookmark.createdAt,
                    description: bookmark.description
                });
            } else {
                bookmark.trackId = track._id;
                bookmark.currentStatus = track.status;

                updatedBookmarks.push({
                    trackNumber: bookmark.trackNumber,
                    currentStatus: track.status,
                    description: bookmark.description,
                    history: track.history
                });
            }
        }));

        // Сохраняем пользователя с обновленными данными закладок
        await user.save();

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
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const index = user.bookmarks.findIndex(b => b.trackNumber.toLowerCase() === trackNumber.toLowerCase());
        if (index === -1) {
            return res.status(404).json({ message: 'Закладка не найдена' });
        }

        user.bookmarks.splice(index, 1);
        await user.save();

        return res.status(200).json({ message: 'Закладка успешно удалена' });
    } catch (error) {
        console.error('Ошибка при удалении закладки:', error.message);
        return res.status(500).json({ message: 'Произошла ошибка при удалении закладки' });
    }
});


module.exports = router;