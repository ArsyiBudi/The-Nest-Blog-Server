const {Router} =  require('express')

const {registerUser, LoginUser, getUser, changeAvatar, editUser, getAuthors} = require("../controllers/userControllers")
const authMiddleware = require('../middleware/authMiddleware')

const router = Router()

router.post('/register', registerUser)
router.post('/login', LoginUser)
router.get('/:id', getUser)
router.get('/', getAuthors)
router.post('/change-avatar', authMiddleware, changeAvatar)
router.patch('/edit-user', authMiddleware, editUser)

module.exports = router;