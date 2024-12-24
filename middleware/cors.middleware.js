function cors(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Обработка предзапросов `OPTIONS`
    if (req.method === "OPTIONS") {
        return res.sendStatus(204); // Отправляем статус 'No Content' для предзапроса
    }

    next();
}

module.exports = cors;
