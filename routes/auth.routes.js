const Router = require("express");
const User = require("../models/User") 
// const bcrypt = require("bcryptjs")
const config = require("config")
const jwt = require("jsonwebtoken")
const {check, validationResult} = require("express-validator")
const authMiddleware = require('../middleware/auth.middleware')

const router = new Router()


// registration router
router.post('/registration', 
    [
        check('phone', 'Неверный номер телефона').not().isEmpty(),
        check('password', 'Неверный пароль').isLength({min: 4, max: 20}),
        check('name', 'Имя обязательно для заполнения').not().isEmpty(),
        check('surname', 'Фамилия обязательна для заполнения').not().isEmpty(),
        // check('selectedFilial', 'Филиал обязателен для заполнения').not().isEmpty(),
        check('isChecked', 'Необходимо согласиться с условиями').equals('true') // Проверяем, что isChecked равен true
    ],
    async (req, res) => {
    try {
        console.log(req.body)

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Получаем первое сообщение об ошибке
            const firstError = errors.array()[0].msg;
            return res.status(400).json({ message: firstError });
        }

        const { phone, password, name, surname, referrer, selectedFilial} = req.body;
        
        const candidate = await User.findOne({ phone });
        if (candidate) {
            return res.status(400).json({ message: 'Пользователь с таким номером телефона уже существует' });
        }

        // Получаем количество пользователей в коллекции User
        const userCount = await User.countDocuments();

        // Присваиваем новый личный идентификатор, равный количеству пользователей + 1
        const personalId = userCount + 1;

        // Создание нового пользователя
        const user = new User({
            phone, 
            password, 
            name, 
            surname, 
            createdAt: new Date(),
            referrer,
            selectedFilial,
            personalId // Добавляем персональный ID
        });

        await user.save();

        return res.json({ message: "Пользователь создан", personalId });

    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Server error" });
    }
});



// login router
router.post('/login', async (req, res) => {
    try {

        const {phone, password} = req.body
        const user = await User.findOne({phone})
        if (!user){
            return res.status(400).json({message: "Пользователь не найден"})
        }
        
        // const isPassValid = bcrypt.compareSync(password, user.password)
        if(password != user.password){
            return res.status(400).json({message: "Неверный пароль!"})
        }

        const token = jwt.sign({id: user.id}, config.get("secretKey"), {expiresIn: "30d"})
        return res.json({
            token,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                surname: user.surname,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            }
        })

    } catch (error) {
        console.log(error)
        res.send({message: "Server error"})
        
    }
})


// auth router
router.get('/auth', authMiddleware, 
    async (req, res) => {
        try {
            const user = await User.findOne({_id: req.user.id})
            const token = jwt.sign({id: user.id}, config.get("secretKey"), {expiresIn: "30d"})
            return res.json({
                token,
                user: {
                    id: user.id,
                    phone: user.phone,
                    name: user.name,
                    surname: user.surname,
                    email: user.email,
                    role: user.role,
                    createdAt: user.createdAt
                }
            })

        } catch (error) {
            console.log(error)
            res.send({message: "Server error"})
            
        }
})


router.post('/update-password', authMiddleware, 
    [
        check('currentPassword', 'Текущий пароль обязателен').not().isEmpty(),
        check('newPassword', 'Новый пароль должен быть длиной от 4 до 20 символов').isLength({ min: 4, max: 20 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const firstError = errors.array()[0].msg;
                return res.status(400).json({ message: firstError });
            }

            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id; // Теперь вы ожидаете, что id будет в req.user

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }

            // Проверяем текущий пароль
            if (user.password !== currentPassword) {
                return res.status(400).json({ message: 'Неверный текущий пароль' });
            }

            // Обновляем пароль
            user.password = newPassword; // Устанавливаем новый пароль
            await user.save();

            return res.json({ message: 'Пароль успешно обновлен' });

        } catch (error) {
            console.error(error);
            res.status(500).send({ message: 'Ошибка сервера' });
        }
    }
);



router.get('/profile', async (req, res) => {
    try {
        // Получаем токен из заголовка запроса или из cookies, где он может быть хранится
        const token = req.headers.authorization.split(' ')[1] || req.cookies.token;

        // Если токен не найден, отправляем ошибку
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Расшифровываем токен, чтобы получить идентификатор пользователя
        const decodedToken = jwt.verify(token, config.get('secretKey'));

        // Ищем пользователя в базе данных по идентификатору из токена
        const user = await User.findOne({ _id: decodedToken.id });

        // Если пользователь не найден, отправляем ошибку
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Возвращаем данные пользователя
        return res.json({
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                surname: user.surname,
                email: user.email,
                role: user.role,
                password: user.password,
                profilePhoto: user.profilePhoto,
                selectedFilial: user.selectedFilial,
                createdAt: user.createdAt,
                personalId: user.personalId,
                bonuses: user.bonuses,
                selectedFilial: user.selectedFilial,
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router
