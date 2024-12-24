const Lost = require('../models/Lost');

const excelLost = async (req, res, next) => {
    try {
        const { tracks } = req.body;

        // Получаем список уже существующих треков
        const existingTracks = await Lost.find({ track: { $in: tracks } });

        // Разделяем массив треков на существующие и новые
        const existingTrackNumbers = existingTracks.map(track => track.track)
        const newTracksData = tracks.filter(track => !existingTrackNumbers.includes(track))
            .map(track => ({
                track
            }));

       

        // Добавляем новые треки
        if (newTracksData.length > 0) {
            await Lost.insertMany(newTracksData);
        }
        
        return res.status(200).json({ message: 'Данные треков успешно обновлены или созданы' });

    } catch (error) {
        console.error('Ошибка при обновлении или создании треков:', error);
        return res.status(500).json({ message: 'Произошла ошибка при обновлении или создании треков' });
        next(error);
    }
};

module.exports = { excelLost };
