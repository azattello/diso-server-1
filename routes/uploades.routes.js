const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const User = require('../models/User');
const Settings = require('../models/Settings'); // Импортируйте модель Settings
const Banner = require("../models/Banner"); // Модель баннера

// Конфигурация multer для загрузки изображений профиля
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/avatars/'); // Папка для сохранения изображений профиля
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Уникальное имя файла
    }
});
const uploadAvatar = multer({ storage: avatarStorage });

// Маршрут для загрузки фото профиля
router.post('/profile-image', uploadAvatar.single('profileImage'), async (req, res) => {
    try {
        const { phone } = req.body;
        const profileImage = req.file ? `/uploads/avatars/${req.file.filename}` : null;

        // Находим пользователя по номеру телефона и обновляем поле profilePhoto
        const user = await User.findOneAndUpdate(
            { phone: phone },
            { profilePhoto: profileImage },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.status(200).json({ imageUrl: profileImage });
    } catch (error) {
        console.error('Error uploading profile image:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});


// Конфигурация multer для загрузки договоров
const contractStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/contracts/'); // Папка для сохранения договоров
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Уникальное имя файла
    }
});
const uploadContract = multer({ storage: contractStorage });

// Маршрут для загрузки договора
router.post('/uploadContract', uploadContract.single('contract'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Файл не загружен' });
        }

        // Формируем путь к файлу договора
        const contractPath = `/uploads/contracts/${req.file.filename}`;

        // Обновляем поле contractFilePath в Settings, но не сохраняем результат
        await Settings.findOneAndUpdate({}, { contractFilePath: contractPath }, { new: true });
        
        res.status(200).json({ message: 'Файл успешно загружен', filePath: contractPath });
    } catch (error) {
        console.error('Ошибка при загрузке договора:', error.message);
        res.status(500).send('Ошибка сервера');
    }
});

// баннер

// Настройка хранения загруженных файлов с помощью multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/banners'); // Путь для сохранения файлов
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

// Маршрут для получения всех баннеров
router.get('/getBanners', async (req, res) => {
    try {
        const banners = await Banner.find(); // Предполагается, что модели баннеров названа "Banner"
        const bannerPaths = banners.map(banner => banner.url); // Собираем пути к баннерам
        res.status(200).json({ banners: bannerPaths });
    } catch (error) {
        res.status(500).json({ message: "Ошибка при получении баннеров" });
    }
});


// Маршрут для загрузки баннера
router.post('/uploadBanner', upload.single('banner'), async (req, res) => {
    try {
        console.log('Файл:', req.file); // Логируем информацию о файле
        if (!req.file) {
            return res.status(400).json({ message: 'Файл не загружен' });
        }

        // Создаем новый баннер
        const newBanner = new Banner({
            url: `/uploads/banners/${req.file.filename}`,
        });

        console.log('Новый баннер:', newBanner); // Логируем информацию перед сохранением

        // Сохраняем баннер в базу данных
        await newBanner.save();

        res.json(newBanner);
    } catch (error) {
        console.error('Ошибка при загрузке баннера:', error); // Логируем ошибку
        res.status(500).json({ message: 'Ошибка при загрузке баннера' });
    }
});

// Маршрут для удаления баннера
router.delete('/deleteBanner', async (req, res) => {
    const { url } = req.body; // Получаем путь к файлу из тела запроса
    try {
        const banner = await Banner.findOneAndDelete({ url }); // Ищем и удаляем баннер по пути
        if (!banner) {
            return res.status(404).json({ message: 'Баннер не найден' });
        }

        // Удаляем файл с сервера
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '..', banner.url); // Убедитесь, что путь корректный

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        } else {
            console.error('Файл не найден:', filePath);
        }

        res.json({ message: 'Баннер удалён' });
    } catch (error) {
        console.error('Ошибка при удалении баннера:', error);
        res.status(500).json({ message: 'Ошибка при удалении баннера', error: error.message });
    }
});







module.exports = router;
