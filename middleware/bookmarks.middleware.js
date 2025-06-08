const Track = require('../models/Track'); // Подключаем модель Track
const User = require('../models/User');   // Подключаем модель User

const getUserBookmarks = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page   = parseInt(req.query.page, 10) || 1;
    const limit  = 20;
    const skip   = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const searchRegex = new RegExp(search, 'i');

    // 1) Забираем пользователя вместе с его «сырыми» закладками
    const user = await User.findById(userId).populate('bookmarks.trackId');
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

    // 2) Фильтрация по запросу поиска
    let bookmarksToProcess = user.bookmarks;
    if (search) {
      bookmarksToProcess = bookmarksToProcess.filter(b => {
        const desc = b.description || '';
        const num  = b.trackNumber || '';
        const trackCode = b.trackId && b.trackId.track
                          ? b.trackId.track
                          : '';
        return searchRegex.test(desc)
            || searchRegex.test(num)
            || searchRegex.test(trackCode);
      });
    }

    // 3) Два массива для найденных и «не найденных» треков
    const updatedBookmarks  = [];
    const notFoundBookmarks = [];

    for (const bookmark of bookmarksToProcess) {
      // 3.a) Если трек ещё не «привязан» к документу Track
      if (!bookmark.trackId) {
        const track = await Track.findOne({ track: bookmark.trackNumber });
        if (track) {
          // Обновляем owner (опционально)
          await Track.updateOne(
            { _id: track._id },
            { $set: { user: user.phone } }
          );
          // Загружаем историю со статусами
          const populated = await Track.findById(track._id)
                                       .populate('history.status', 'statusText');
          const hasReceived = populated.history.some(h => 
            h.status?.statusText === 'Получено'
          );
          if (!hasReceived) {
            updatedBookmarks.push({
              ...bookmark.toObject(),
              trackDetails: populated,
              history: populated.history
            });
          }
        } else {
          notFoundBookmarks.push({
            trackNumber: bookmark.trackNumber,
            createdAt:   bookmark.createdAt,
            description: bookmark.description,
          });
        }
        continue;
      }

      // 3.b) Если есть bookmark.trackId
      const track = await Track.findById(bookmark.trackId)
                               .populate('history.status', 'statusText');
      const hasReceived = track.history.some(h => 
        h.status?.statusText === 'Получено'
      );
      if (!hasReceived) {
        updatedBookmarks.push({
          ...bookmark.toObject(),
          trackDetails: track,
          history:      track.history
        });
      }
    }

    // 4) Пагинация уже отфильтрованного списка
    const totalFiltered = updatedBookmarks.length + notFoundBookmarks.length;
    const paginated     = updatedBookmarks.slice(skip, skip + limit);

    res.status(200).json({
      updatedBookmarks:  paginated,
      notFoundBookmarks,
      totalPages:        Math.ceil(totalFiltered / limit),
      totalBookmarks:    totalFiltered
    });
  } catch (error) {
    console.error('Ошибка при получении закладок пользователя:', error);
    res.status(500).json({ message: 'Произошла ошибка при получении закладок' });
  }
};

module.exports = { getUserBookmarks };

