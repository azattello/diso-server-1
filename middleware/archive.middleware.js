const Track = require('../models/Track'); // Подключаем модель Track
const User = require('../models/User');   // Подключаем модель User

// Функция для получения архива закладок пользователя
const getUserArchive = async (req, res) => {
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

    // Обходим каждую закладку пользователя
    for (const bookmark of user.bookmarks) {
      // Пропускаем закладки, если нет trackId
      if (!bookmark.trackId) continue;

      // Подгружаем информацию о треке и текстовые значения статусов в истории
      const track = await Track.findById(bookmark.trackId).populate('history.status', 'statusText');

      // Проверяем, если статус "Получено" присутствует в истории этого трека
      const hasReceivedStatus = track.history.some(
        (historyItem) => historyItem.status && historyItem.status.statusText === 'Получено'
      );

      // Если статус "Получено" отсутствует, пропускаем эту закладку
      if (!hasReceivedStatus) continue;

      // Если статус "Получено" присутствует, добавляем закладку в результаты
      updatedBookmarks.push({
        ...bookmark.toObject(),
        trackDetails: track, // Добавляем информацию о треке
        history: track.history, // Добавляем историю статусов с текстом
        price: user.personalRate ? (parseFloat(track.weight) * parseFloat(user.personalRate)).toFixed(2) : track.price || 'Неизвестно',
        weight: track.weight || 'Неизвестно',
        place: track.place || '-'
      });
    }

    // Пагинация для отфильтрованных закладок
    const paginatedBookmarks = updatedBookmarks.slice(skip, skip + limit);
    const totalPages = Math.ceil(updatedBookmarks.length / limit);

    res.status(200).json({
      updatedBookmarks: paginatedBookmarks,
      totalPages,
      totalBookmarks: updatedBookmarks.length
    });
  } catch (error) {
    console.error('Ошибка при получении архива закладок пользователя:', error);
    res.status(500).json({ message: 'Произошла ошибка при получении архива закладок' });
  }
};

module.exports = { getUserArchive };
