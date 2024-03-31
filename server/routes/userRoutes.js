const {Router} =  require('express')

const {registerUser, LoginUser, getUser, changeAvatar, editUser, getAuthors} = require("../controllers/userControllers")

const router = Router()

router.post('/register', registerUser)
router.post('/login', LoginUser)
router.get('/:id', getUser)
router.get('/', getAuthors)
router.post('/change-avatar', changeAvatar)
router.patch('/edit-user', editUser)

module.exports = router;