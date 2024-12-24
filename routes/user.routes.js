const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require("jsonwebtoken")
const config = require("config")
const mongoose = require('mongoose'); // Добавьте эту строку для импорта mongoose


router.get('/users', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const sortByDate = req.query.sortByDate || 'latest';
  const searchQuery = req.query.search || '';
  const sortByActivity = req.query.sortByActivity === 'true';
  const filterByRole = req.query.filterByRole || '';
  const filterByFilial = req.query.filterByFilial || ''; // Новый фильтр по филиалу
  const invoiceStatus = req.query.invoiceStatus || 'all'; // Новый фильтр по статусу счета

  try {
    const startIndex = (page - 1) * limit;
    let query = {};

    // Поиск по имени, фамилии или номеру телефона
    if (searchQuery) {
      const parsedQuery = parseInt(searchQuery);
      if (!isNaN(parsedQuery)) {
        query.phone = parsedQuery;
      } else {
        query.$or = [
          { name: { $regex: new RegExp(searchQuery, 'i') } },
          { surname: { $regex: new RegExp(searchQuery, 'i') } }
        ];
      }
    }

    // Фильтрация по роли
    if (filterByRole) {
      query.role = filterByRole;
    }

    // Фильтрация по филиалу
    if (filterByFilial) {
      query.selectedFilial = filterByFilial;
    }

    // Настройки сортировки
    let sortOptions = {};
    if (sortByDate === 'latest') {
      sortOptions.createdAt = -1;
    } else if (sortByDate === 'oldest') {
      sortOptions.createdAt = 1;
    }

    // Выполняем запрос к базе данных с сортировкой, фильтрацией и пагинацией
    let users = await User.find(query)
      .sort(sortOptions)
      .limit(limit)
      .skip(startIndex)
      .lean();

    // Фильтрация по статусу счета
    if (invoiceStatus !== 'all') {
      // Используем только пользователей с инвойсами, чтобы проверить их статус
      users = users.filter(user => {
        const hasPendingInvoice = user.invoices?.some(invoice => invoice.status === 'pending');
        const hasPaidInvoice = user.invoices?.some(invoice => invoice.status === 'paid');

        if (invoiceStatus === 'pending') {
          return hasPendingInvoice; // Показываем только пользователей с неоплаченными счетами
        } else if (invoiceStatus === 'paid') {
          return hasPaidInvoice; // Показываем только пользователей с оплаченными счетами
        }
        return false; // Если счет не соответствует ни одному статусу
      });
    }

    // Подсчет количества закладок и архивных записей для каждого пользователя
    const usersWithCounts = users.map(user => ({
      ...user,
      bookmarkCount: (user.bookmarks || []).length,
      archiveCount: (user.archive || []).length,
      totalActivity: (user.bookmarks || []).length + (user.archive || []).length
    }));

    // Фильтрация по активности
    if (sortByActivity) {
      usersWithCounts.sort((a, b) => b.totalActivity - a.totalActivity);
    }

    // Подсчитываем общее количество пользователей после фильтрации по счетам
    const totalCount = usersWithCounts.length;

    // Пагинация уже после фильтрации по счетам
    const paginatedUsers = usersWithCounts.slice(startIndex, startIndex + limit);

    res.json({
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      users: paginatedUsers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});


router.get('/referrals', async (req, res) => {
  try {
    // Получаем токен из заголовка запроса или из cookies, где он может быть хранится
    const token = req.headers.authorization.split(' ')[1] || req.cookies.token;

    // Если токен не найден, отправляем ошибку
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Расшифровываем токен, чтобы получить идентификатор пользователя
    const decodedToken = jwt.verify(token, config.get('secretKey'));

    console.log(decodedToken)
    const referrals = await User.find({ referrer: decodedToken.id }); // Поиск пользователей с этим referrer

    res.status(200).json(referrals); // Возвращаем список найденных пользователей
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка при получении рефералов' });
  }
});


// Роут для обновления бонусного процента пользователя
router.post('/:userId/updateBonusPercentage', async (req, res) => {
  const { userId } = req.params;
  const { referralBonusPercentage } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Неверный формат идентификатора пользователя' });
  }

  if (referralBonusPercentage == null || referralBonusPercentage < 0) {
      return res.status(400).json({ message: 'Неверный процент бонуса' });
  }

  try {
      const user = await User.findById(userId);

      if (!user) {
          return res.status(404).json({ message: 'Пользователь не найден' });
      }

      user.referralBonusPercentage = referralBonusPercentage;
      await user.save();

      return res.status(200).json({ message: 'Процент бонуса пользователя успешно обновлен' });
  } catch (error) {
      console.error('Ошибка при обновлении процента бонуса пользователя:', error.message);
      return res.status(500).json({ message: 'Произошла ошибка при обновлении процента бонуса' });
  }
});



// Получение бонусного процента пользователя
router.get('/api/user/:userId/bonusPercentage', async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Неверный ID пользователя' });
  }

  try {
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: 'Пользователь не найден' });
      }

      res.status(200).json({ referralBonusPercentage: user.referralBonusPercentage });
  } catch (error) {
      res.status(500).json({ message: 'Ошибка при получении процента бонуса пользователя' });
  }
});

// Обновление бонусного процента пользователя
router.post('/api/user/:userId/updateBonusPercentage', async (req, res) => {
  const { userId } = req.params;
  const { referralBonusPercentage } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Неверный ID пользователя' });
  }

  try {
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: 'Пользователь не найден' });
      }

      user.referralBonusPercentage = referralBonusPercentage;
      await user.save();

      res.status(200).json({ message: 'Процент бонуса пользователя успешно обновлен' });
  } catch (error) {
      res.status(500).json({ message: 'Ошибка при обновлении процента бонуса пользователя' });
  }
});



// Роут для обновления личного тарифа пользователя
router.post('/:userId/updatePersonalRate', async (req, res) => {
  const { userId } = req.params;
  const { personalRate } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Неверный формат идентификатора пользователя' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    user.personalRate = personalRate; // Добавляем или обновляем личный тариф пользователя
    await user.save();

    return res.status(200).json({ message: 'Личный тариф пользователя успешно обновлен' });
  } catch (error) {
    console.error('Ошибка при обновлении личного тарифа пользователя:', error.message);
    return res.status(500).json({ message: 'Произошла ошибка при обновлении личного тарифа' });
  }
});




module.exports = router;
