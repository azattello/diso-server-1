const express = require('express');
const router = express.Router();
const Filial = require('../models/Filial');
const User = require('../models/User');

// Маршрут для добавления нового филиала
router.post('/addFilial', async (req, res) => {
    try {
      const { filialId, filialText, userPhone, filialAddress } = req.body;
      
      // Проверяем, существует ли пользователь с указанным номером телефона
      const user = await User.findOne({ phone: userPhone });
      if (!user) {
        return res.status(400).json({ message: 'Пользователь с указанным номером телефона не найден' });
      }
      
       // Проверяем, является ли пользователь администратором
    if (user.role === 'admin') {
        return res.status(400).json({ message: 'Нельзя создать филиал для пользователя с ролью администратора' });
      }

      // Проверяем, существует ли уже филиал для данного пользователя
      const existingFilial = await Filial.findOne({ userId: user._id });
      if (existingFilial) {
        return res.status(400).json({ message: 'У пользователя уже есть филиал' });
      }

      // Присваиваем пользователю роль "filial"
      user.role = 'filial';
      await user.save();
  
      // Создаем новый филиал
      const newFilial = new Filial({ filialId, filialText, userPhone, filialAddress, userId: user._id  });
      await newFilial.save();
  
      res.status(201).json({ message: 'Филиал успешно добавлен' });
    } catch (error) {
      console.error(error);
      res.status(500).send('Ошибка сервера.');
    }
  });


// Маршрут для получения данных о всех филиалах и их пользователях, отсортированных по дате создания
router.get('/getFilial', async (req, res) => {
    try {
      // Получаем данные о всех филиалах из базы данных, отсортированные по дате создания
      const filials = await Filial.find().sort({ createdAt: 'asc' });
  
      // Создаем массив для хранения данных о филиалах и их пользователях
      const filialData = [];
  
      // Для каждого филиала находим соответствующего пользователя и добавляем данные в массив
      for (const filial of filials) {
        const user = await User.findOne({ phone: filial.userPhone });
        filialData.push({
          filial,
          user
        });
      }

      res.status(200).json(filialData);
    } catch (error) {
      console.log(error);
      res.status(500).send('Ошибка сервера');
    }
  });

// Маршрут для удаления филиала
router.delete('/deleteFilial/:id', async (req, res) => {
  try {
    const filialId = req.params.id;

    // Находим филиал по его идентификатору
    const filial = await Filial.findById(filialId);
    if (!filial) {
      return res.status(404).json({ message: 'Филиал не найден' });
    }

    // Находим пользователя, привязанного к этому филиалу
    const user = await User.findById(filial.userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Изменяем роль пользователя на "client"
    user.role = 'client';
    await user.save();

    // Удаляем филиал
    await Filial.findByIdAndDelete(filialId);

    res.status(200).json({ message: 'Филиал успешно удален' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Ошибка сервера.');
  }
});


// Маршрут для получения данных о филиале по номеру телефона пользователя
router.get('/getFilialByUserPhone', async (req, res) => {
  const { userPhone } = req.query;

  // Проверка наличия номера телефона
  if (!userPhone) {
    return res.status(400).json({ message: 'Номер телефона не предоставлен' });
  }

  try {
    // Находим филиал по номеру телефона пользователя
    const filial = await Filial.findOne({ userPhone });

    // Проверка, найден ли филиал
    if (!filial) {
      return res.status(404).json({ message: 'Филиал не найден' });
    }

    // Отправка данных о филиале
    res.status(200).json(filial);
  } catch (error) {
    console.error('Ошибка при получении филиала по номеру телефона:', error.message);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});



// Маршрут для получения пользователей по названию филиала
router.get('/getUsersByFilial', async (req, res) => {
  const { filialText } = req.query;

  try {
    // Поиск пользователей по названию филиала
    const users = await User.find({ selectedFilial: filialText }).lean();

    // Проверка, есть ли пользователи
    if (users.length === 0) {
      return res.status(404).json({ message: 'Пользователи не найдены' });
    }

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});



module.exports = router;
