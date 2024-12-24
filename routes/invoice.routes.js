const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Settings = require('../models/Settings');

// Получить неоплаченный счет пользователя
router.get('/:userId/current-invoice', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).populate('invoices.bookmarks.trackId');

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const currentInvoice = user.invoices.find(invoice => invoice.status === 'pending');

    if (!currentInvoice) {
      return res.status(200).json({ message: 'Нет неоплаченных счетов' });
    }

    return res.status(200).json(currentInvoice);
  } catch (error) {
    console.error('Ошибка при получении неоплаченного счета:', error);
    return res.status(500).json({ message: 'Ошибка при получении счета' });
  }
});

// Добавить новые товары в неоплаченный счет
router.post('/:userId/update-invoice', async (req, res) => {
  try {
    const { userId } = req.params;
    const { newBookmarks } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Получаем неоплаченный счет или создаем новый, если его нет
    let invoice = user.invoices.find(inv => inv.status === 'pending');
    if (!invoice) {
      invoice = {
        totalAmount: 0,
        totalWeight: 0,
        totalItems: 0,
        bookmarks: [],
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      user.invoices.push(invoice);
    }

    let itemsAdded = false; // Флаг для отслеживания добавления товаров

    newBookmarks.forEach(bookmark => {
      const { trackNumber, price, weight } = bookmark;

      const existingInInvoice = invoice.bookmarks.some(b => b.trackNumber === trackNumber);
      const isAlreadyPaid = user.bookmarks.some(b => b.trackNumber === trackNumber && b.isPaid);

      // Пропускаем закладки без цены и веса
      if (!price || !weight || existingInInvoice || isAlreadyPaid) {
        console.log(`Закладка с номером ${trackNumber} пропущена. Причина: нет цены или веса, уже оплачена, или уже существует в счёте.`);
        return; // Пропускаем такие закладки
      }

      const parsedPrice = parseFloat(price);
      const parsedWeight = parseFloat(weight);

      if (isNaN(parsedPrice) || isNaN(parsedWeight)) {
        console.log(`Закладка с номером ${trackNumber} пропущена. Причина: некорректное значение цены или веса.`);
        return;
      }

      // Добавляем товар в счет и обновляем его общие параметры
      invoice.bookmarks.push(bookmark);
      invoice.totalAmount += parsedPrice;
      invoice.totalWeight += parsedWeight;
      invoice.totalItems += 1;
      itemsAdded = true; // Флаг, что хотя бы один товар был добавлен
    });

    // Если ни один товар не был добавлен и счет не содержит товаров, удаляем его из массива
    if (!itemsAdded && invoice.totalItems === 0) {
      user.invoices = user.invoices.filter(inv => inv !== invoice); // Убираем счет из массива
      console.log('Ни один товар не был добавлен. Счет не будет создан или сохранен.');
    } else {
      // Обновляем дату последнего изменения счета
      invoice.updatedAt = Date.now();
    }

    await user.save();
    res.status(200).json(invoice);
  } catch (error) {
    console.error('Ошибка при обновлении счета:', error.message);
    res.status(500).json({ message: 'Ошибка при обновлении счета', error: error.message });
  }
});




// Подтвердить оплату счета и рассчитать бонусы для реферера
router.post('/:userId/confirm-payment/:invoiceId', async (req, res) => {
    try {
        const { userId, invoiceId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const invoice = user.invoices.id(invoiceId);
        if (!invoice) {
            return res.status(404).json({ message: 'Счет не найден' });
        }

        // Проверяем, что счет еще не оплачен
        if (invoice.status === 'paid') {
            return res.status(400).json({ message: 'Счет уже оплачен' });
        }

        // Подтверждаем оплату
        invoice.status = 'paid';
        invoice.updatedAt = Date.now();

        // Устанавливаем статус оплаты для каждого трека в счете
        invoice.bookmarks.forEach(invoiceBookmark => {
          const bookmark = user.bookmarks.find(b => b.trackNumber === invoiceBookmark.trackNumber);
          if (bookmark) {
            bookmark.isPaid = true; // Устанавливаем статус оплаты
          }
        });
        
        // Рассчитываем общую сумму оплаты
        let totalPrice = invoice.totalAmount;

        // Получаем глобальный процент бонуса из настроек
        const settings = await Settings.findOne();
        const globalBonusPercentage = settings ? parseFloat(settings.globalReferralBonusPercentage) : 0;
        
        let userBonusPercentage;

        // Определяем процент бонуса для реферера
        if (user.referrer) {
            const referrer = await User.findById(user.referrer);
            userBonusPercentage = referrer?.referralBonusPercentage || globalBonusPercentage;
        } else {
            userBonusPercentage = globalBonusPercentage;
        }

        // Вычисляем сумму бонуса
        const bonusAmount = parseFloat((totalPrice * (userBonusPercentage / 100)).toFixed(1));

        // Начисляем бонус рефереру, если он существует
        if (user.referrer) {
            const referrer = await User.findById(user.referrer);
            if (referrer) {
                referrer.bonuses = (referrer.bonuses || 0) + bonusAmount;
                await referrer.save();
            }
        }

        // Сохраняем изменения пользователя
        await user.save();

        res.status(200).json({ message: 'Оплата подтверждена и бонус начислен', invoice });
    } catch (error) {
        console.error('Ошибка при подтверждении оплаты счета:', error);
        res.status(500).json({ message: 'Ошибка при подтверждении оплаты счета' });
    }
});


  

module.exports = router;
