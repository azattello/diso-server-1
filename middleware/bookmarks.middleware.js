const Track = require('../models/Track'); // Подключаем модель Track
const User = require('../models/User');   // Подключаем модель User

// Функция для получения закладок пользователя с учетом пагинации
const getUserBookmarks = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Находим пользователя по ID и заполняем закладки
    const user = await User.findById(userId).populate('bookmarks.trackId');

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const updatedBookmarks = [];
    const notFoundBookmarks = [];

    // Обходим каждую закладку пользователя
    for (const bookmark of user.bookmarks) {
      // Если у закладки нет trackId, ищем трек по trackNumber
      if (!bookmark.trackId) {
        const track = await Track.findOne({ track: bookmark.trackNumber });

        if (track) {

             // Обновляем поле user в модели трека
            await Track.updateOne(
            { _id: track._id },
            { $set: { user: user.phone } }
          );

          // Подтягиваем данные статусов в истории
          const populatedTrack = await Track.findById(track._id)
            .populate('history.status', 'statusText');

          // Проверяем, есть ли статус "Получено" в истории этого трека
          const hasReceivedStatus = populatedTrack.history.some(
            (historyItem) => historyItem.status && historyItem.status.statusText === 'Получено'
          );



          if (!hasReceivedStatus) {
            updatedBookmarks.push({
              ...bookmark.toObject(),
              trackDetails: populatedTrack,
              history: populatedTrack.history
            });
          }
        } else {
          // Если трек не найден, добавляем его в notFoundBookmarks
          notFoundBookmarks.push({
            trackNumber: bookmark.trackNumber,
            createdAt: bookmark.createdAt,
            description: bookmark.description,
          });
        }
        continue;
      }

      // Если trackId существует, загружаем сам трек и его историю с текстом статусов
      const track = await Track.findById(bookmark.trackId)
        .populate('history.status', 'statusText'); // Подтягиваем текст статуса

      // Проверяем, есть ли статус "Получено" в истории этого трека
      const hasReceivedStatus = track.history.some(
        (historyItem) => historyItem.status && historyItem.status.statusText === 'Получено'
      );

      // Если статус "Получено" есть, пропускаем эту закладку
      if (hasReceivedStatus) continue;

      // Если статус "Получено" отсутствует, добавляем закладку в результаты
      updatedBookmarks.push({
        ...bookmark.toObject(),
        trackDetails: track,
        history: track.history
      });
    }

    // Пагинация для отфильтрованных закладок
    const paginatedBookmarks = updatedBookmarks.slice(skip, skip + limit);
    const totalPages = Math.ceil(updatedBookmarks.length / limit);

    res.status(200).json({
      updatedBookmarks: paginatedBookmarks,
      notFoundBookmarks,
      totalPages,
      totalBookmarks: updatedBookmarks.length + notFoundBookmarks.length
    });
  } catch (error) {
    console.error('Ошибка при получении закладок пользователя:', error);
    res.status(500).json({ message: 'Произошла ошибка при получении закладок' });
  }
};

module.exports = { getUserBookmarks };
