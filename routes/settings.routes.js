const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const Contacts = require('../models/Contacts');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');


// Конфигурация multer для загрузки документов
const contractStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/contracts/';
        cb(null, dir); // Папка для сохранения документов
    },
    filename: function (req, file, cb) {
        // Генерация уникального имени файла
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const uploadContract = multer({ storage: contractStorage });

// Маршрут для обновления настроек с загрузкой документа
router.post('/updateSettings', uploadContract.single('contract'), [
    check('videoLink').optional().isString(),
    check('chinaAddress').optional().isString(),
    check('whatsappNumber').optional().isString(),
    check('aboutUsText').optional().isString(),
    check('prohibitedItemsText').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Неверный запрос', errors });
        }

        const { videoLink, chinaAddress, whatsappNumber, aboutUsText, prohibitedItemsText } = req.body;

        // Получаем текущие настройки или создаем новые
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        // Обновляем поля настроек
        if (videoLink) settings.videoLink = videoLink;
        if (chinaAddress) settings.chinaAddress = chinaAddress;
        if (whatsappNumber) settings.whatsappNumber = whatsappNumber;
        if (aboutUsText) settings.aboutUsText = aboutUsText;
        if (prohibitedItemsText) settings.prohibitedItemsText = prohibitedItemsText;

        // Обработка загруженного файла, если он есть
        if (req.file) {
            const contractPath = `/uploads/contracts/${req.file.filename}`; // Формируем путь к загруженному документу
            settings.contractFilePath = contractPath; // Сохраняем путь к загруженному документу
        }

        // Сохраняем изменения в базе данных
        await settings.save();
        res.status(200).json(settings); // Возвращаем обновленные настройки
    } catch (error) {
        console.error('Ошибка при обновлении настроек:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});



// Маршрут для получения настроек
router.get('/getSettings', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.status(200).json(settings);
    } catch (error) {
        console.error('Ошибка при получении настроек:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});


// Маршрут для получения настроек
router.get('/getPrice', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.status(200).json(settings);
    } catch (error) {
        console.error('Ошибка при получении настроек:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});

// Маршрут для обновления настроек
router.post('/updatePrice', [
    check('price').optional().isString(),
    check('currency').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Неверный запрос', errors });
        }

        const { price,currency } = req.body;

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        if (price) settings.price = price;
        if (currency) settings.currency = currency;
        
        await settings.save();
        res.status(200).json(settings);
    } catch (error) {
        console.error('Ошибка при обновлении настроек:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});


// На сервере (например, в Express.js)
router.put('/globalBonus', async (req, res) => {
    const { globalReferralBonusPercentage } = req.body;
    try {
        const settings = await Settings.findOne();
        if (!settings) {
            return res.status(404).json({ message: 'Настройки не найдены' });
        }
        settings.globalReferralBonusPercentage = globalReferralBonusPercentage;
        await settings.save();
        res.json({ message: 'Общий процент бонуса обновлен' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении настроек' });
    }
});


// Получение глобального процента
router.get('/getGlobalBonus', async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.status(200).json({ globalReferralBonusPercentage: settings.globalReferralBonusPercentage });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении настроек' });
    }
});




// Контакты
router.post('/updateContacts', async (req, res) => {
    try {
        const {phone, whatsappPhone, whatsappLink, instagram, telegramId, telegramLink} = req.body;

        // Получаем текущие настройки или создаем новые
        let contacts = await Contacts.findOne();
        if (!contacts) {
            contacts = new Contacts();
        }

        // Обновляем поля настроек
        if (phone) contacts.phone = phone;
        if (whatsappPhone) contacts.whatsappPhone = whatsappPhone;
        if (whatsappLink) contacts.whatsappLink = whatsappLink;
        if (instagram) contacts.instagram = instagram;
        if (telegramId) contacts.telegramId = telegramId;
        if (telegramLink) contacts.telegramLink = telegramLink;


        // Сохраняем изменения в базе данных
        await contacts.save();
        res.status(200).json(contacts); // Возвращаем обновленные настройки

    } catch (error) {
        console.error('Ошибка при обновлении настроек:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});



// Маршрут для получения настроек
router.get('/getContacts', async (req, res) => {
    try {
        const contacts = await Contacts.findOne();
        res.status(200).json(contacts);
    } catch (error) {
        console.error('Ошибка при получении настроек:', error.message);
        res.status(500).send('Ошибка сервера.');
    }
});




module.exports = router;